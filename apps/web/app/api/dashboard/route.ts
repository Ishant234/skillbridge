import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { igotClient } from "@/lib/igot";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [scores, enrollments, recommendations, profile, availableCourses, attempts] =
    await Promise.all([
      prisma.competencyScore.findMany({ where: { userId: user.id } }),
      prisma.enrollment.findMany({
        where: { userId: user.id },
        include: { course: true },
        orderBy: { enrolledAt: "desc" },
      }),
      prisma.recommendation.findMany({
        where: { userId: user.id },
        include: { course: true },
        orderBy: { score: "desc" },
        take: 20,
      }),
      prisma.profile.findUnique({ where: { userId: user.id } }),
      prisma.course.findMany({ orderBy: { title: "asc" } }),
      prisma.quizAttempt.findMany({
        where: { userId: user.id },
        include: { assessment: { include: { course: true } } },
        orderBy: { attemptedAt: "desc" },
        take: 10,
      }),
    ]);

  // Sync iGOT completion feed in parallel (cap to 10 to keep dashboard snappy)
  const syncedEnrollments = await Promise.all(
    enrollments.slice(0, 10).map(async (e) => {
      try {
        const status = await igotClient.getEnrollmentStatus(user.id, e.courseId);
        if (status && status.status !== e.status) {
          return prisma.enrollment.update({
            where: { id: e.id },
            data: {
              status: status.status,
              completedAt: status.status === "COMPLETED" ? new Date() : e.completedAt,
            },
            include: { course: true },
          });
        }
      } catch {
        /* ignore */
      }
      return e;
    })
  );
  // Keep any enrollments beyond the cap unchanged
  if (enrollments.length > 10) {
    syncedEnrollments.push(...enrollments.slice(10));
  }

  // Quizzes only for courses the learner is enrolled in (§5: enroll → then assess)
  const enrolledCourseIds = syncedEnrollments.map((e) => e.courseId);
  const assessments =
    enrolledCourseIds.length === 0
      ? []
      : await prisma.assessment.findMany({
          where: { courseId: { in: enrolledCourseIds } },
          include: {
            course: true,
            _count: { select: { questions: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        });

  const totalRequired = scores.reduce((s, c) => s + c.requiredLevel, 0);
  const totalGap = scores.reduce((s, c) => s + Math.max(c.gap, 0), 0);
  const overallReadiness =
    scores.length && totalRequired > 0
      ? Math.max(0, Math.round(100 - (totalGap / totalRequired) * 100))
      : null;

  const enrolledIds = new Set(enrolledCourseIds);
  const available = availableCourses.filter((c) => !enrolledIds.has(c.id));
  const completed = syncedEnrollments.filter((e) => e.status === "COMPLETED");
  const remediationRecs = recommendations.filter((r) => r.generatedBy === "REMEDIATION_ENGINE");
  const initialRecs = recommendations.filter((r) => r.generatedBy === "INITIAL_ENGINE");

  let igotCatalogueCount = 0;
  try {
    const cat = await igotClient.getCourseCatalogue();
    igotCatalogueCount = cat.length;
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    scores,
    enrollments: syncedEnrollments,
    recommendations: initialRecs,
    remediation: remediationRecs,
    profile,
    overallReadiness,
    role: user.role,
    availableCourses: available,
    completedCourses: completed,
    assessments: assessments.map((a) => ({
      id: a.id,
      title: a.title,
      courseId: a.courseId,
      courseTitle: a.course.title,
      questionCount: a._count.questions,
    })),
    quizAttempts: attempts,
    igotCatalogueCount,
  });
}
