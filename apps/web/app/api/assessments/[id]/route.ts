import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

/** GET /api/assessments/[id] — fetch assessment with questions for quiz UI */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      course: true,
      questions: true,
    },
  });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Learners must be enrolled in the course; staff can preview any assessment
  if (!isStaff(user.role)) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: assessment.courseId },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "Enroll in this course before taking its quiz." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ assessment });
}
