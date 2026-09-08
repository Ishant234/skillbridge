import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  assessmentId: z.string(),
  score: z.number().min(0).max(100),
  weakTopics: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await req.json());

    const assessment = await prisma.assessment.findUnique({
      where: { id: body.assessmentId },
      select: { courseId: true },
    });
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: assessment.courseId },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "Enroll in this course before submitting a quiz." },
        { status: 403 }
      );
    }

    const attemptCount = await prisma.quizAttempt.count({
      where: { userId: user.id, assessmentId: body.assessmentId },
    });

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        assessmentId: body.assessmentId,
        score: body.score,
        weakTopics: body.weakTopics,
        attemptNumber: attemptCount + 1,
      },
    });

    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Quiz submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    include: { assessment: { include: { course: true } } },
    orderBy: { attemptedAt: "desc" },
  });
  return NextResponse.json({ attempts });
}
