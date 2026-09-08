import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

/**
 * GET /api/admin/analytics
 * Aggregates org metrics locally (fast). Engine 2 course-outcome-analytics is
 * plain aggregation per §11.3 — computing it here avoids hanging when the
 * FastAPI service is slow/down.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [allScores, allEnrollments, allAttempts, userCount, courses] = await Promise.all([
    prisma.competencyScore.findMany(),
    prisma.enrollment.findMany({ include: { course: true } }),
    prisma.quizAttempt.findMany({
      include: { assessment: { include: { course: true } } },
    }),
    prisma.user.count(),
    prisma.course.findMany({
      select: { id: true, title: true, domain: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const domainMap: Record<string, { total: number; count: number }> = {};
  for (const s of allScores) {
    if (!domainMap[s.domain]) domainMap[s.domain] = { total: 0, count: 0 };
    domainMap[s.domain].total += s.currentLevel;
    domainMap[s.domain].count++;
  }
  const domainDistribution = Object.entries(domainMap).map(([domain, v]) => ({
    domain,
    avgCurrentLevel: Math.round(v.total / v.count),
  }));

  const avgScore = allAttempts.length
    ? allAttempts.reduce((s, a) => s + a.score, 0) / allAttempts.length
    : 0;
  const passRate = allAttempts.length
    ? (allAttempts.filter((a) => a.score >= 60).length / allAttempts.length) * 100
    : 0;

  // Local course-outcome aggregation (same math as Engine 2 /course-outcome-analytics)
  const byCourse = new Map<
    string,
    { courseId: string; courseTitle: string; scores: number[] }
  >();
  for (const a of allAttempts) {
    const courseId = a.assessment.courseId;
    const courseTitle = a.assessment.course.title;
    if (!byCourse.has(courseId)) {
      byCourse.set(courseId, { courseId, courseTitle, scores: [] });
    }
    byCourse.get(courseId)!.scores.push(a.score);
  }
  const courseOutcomes = [...byCourse.values()].map((c) => {
    const totalAttempts = c.scores.length;
    const avg = totalAttempts ? c.scores.reduce((s, n) => s + n, 0) / totalAttempts : 0;
    const pass = totalAttempts
      ? (c.scores.filter((s) => s >= 60).length / totalAttempts) * 100
      : 0;
    return {
      courseId: c.courseId,
      courseTitle: c.courseTitle,
      totalAttempts,
      avgScore: Math.round(avg * 10) / 10,
      passRate: Math.round(pass * 10) / 10,
      avgCompletionTimeSec: null,
    };
  });

  const skillDemand = Object.entries(
    allScores.reduce(
      (acc, s) => {
        const key = `${s.domain}::${s.skillName}`;
        if (!acc[key]) acc[key] = { domain: s.domain, skillName: s.skillName, gapSum: 0, n: 0 };
        acc[key].gapSum += Math.max(s.gap, 0);
        acc[key].n += 1;
        return acc;
      },
      {} as Record<string, { domain: string; skillName: string; gapSum: number; n: number }>
    )
  )
    .map(([, v]) => ({
      domain: v.domain,
      skillName: v.skillName,
      avgGap: Math.round((v.gapSum / v.n) * 10) / 10,
    }))
    .sort((a, b) => b.avgGap - a.avgGap)
    .slice(0, 8);

  const enrollmentByStatus = {
    ENROLLED: allEnrollments.filter((e) => e.status === "ENROLLED").length,
    IN_PROGRESS: allEnrollments.filter((e) => e.status === "IN_PROGRESS").length,
    COMPLETED: allEnrollments.filter((e) => e.status === "COMPLETED").length,
  };

  return NextResponse.json({
    userCount,
    totalEnrollments: allEnrollments.length,
    totalAttempts: allAttempts.length,
    avgScore: Math.round(avgScore * 10) / 10,
    passRate: Math.round(passRate * 10) / 10,
    domainDistribution,
    courseOutcomes,
    completedCourses: enrollmentByStatus.COMPLETED,
    enrollmentByStatus,
    skillDemand,
    courses,
  });
}
