import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { embedText } from "@/lib/embeddings";
import { findSimilarChunks } from "@/lib/retrieval";
import { z } from "zod";

const schema = z.object({
  weakTopics: z.array(z.string()).optional(),
  quizAttemptId: z.string().optional(),
});

/**
 * POST /api/assessments/[id]/retest
 * RAG over weak topics → Engine 2 /modify-quiz → replace questions + write QuizAttempt (§6)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assessmentId } = await params;

  try {
    const body = schema.parse(await req.json().catch(() => ({})));

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    let weakTopics = body.weakTopics ?? [];
    let lastScore = 0;
    if (body.quizAttemptId) {
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: body.quizAttemptId },
      });
      if (attempt && attempt.userId === user.id) {
        weakTopics = attempt.weakTopics;
        lastScore = attempt.score;
      }
    }

    if (weakTopics.length === 0) {
      const lastAttempt = await prisma.quizAttempt.findFirst({
        where: { userId: user.id, assessmentId },
        orderBy: { attemptedAt: "desc" },
      });
      weakTopics = lastAttempt?.weakTopics ?? ["general review"];
      lastScore = lastAttempt?.score ?? 0;
    }

    const retrievedChunks: string[] = [];
    for (const topic of weakTopics.slice(0, 5)) {
      try {
        const emb = await embedText(topic);
        const chunks = await findSimilarChunks(
          emb,
          "COURSE_MATERIAL",
          assessment.courseId,
          4
        );
        retrievedChunks.push(...chunks.map((c) => c.content));
      } catch (err) {
        console.warn(`[retest] RAG failed for "${topic}":`, err);
      }
    }

    // Paste-only MCQ demos may have no COURSE_MATERIAL chunks — use prior Q&A as source
    const priorSource =
      retrievedChunks.length === 0
        ? assessment.questions
            .map(
              (q) =>
                `${q.questionText}\nOptions: ${q.options.join(" | ")}\nExplanation: ${q.explanation}`
            )
            .join("\n\n")
        : null;

    const engineUrl = process.env.ASSESSMENT_ENGINE_URL ?? "http://localhost:8003";
    const res = await fetchWithRetry(`${engineUrl}/modify-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extractedText: priorSource,
        retrievedChunks,
        previousQuestions: assessment.questions.map((q) => q.questionText),
        weakTopics,
      }),
      timeoutMs: 90000,
    });

    if (!res.ok) throw new Error(`Engine ${res.status}`);
    const { questions } = await res.json();

    await prisma.question.deleteMany({ where: { assessmentId } });
    await prisma.question.createMany({
      data: questions.map(
        (q: {
          questionText: string;
          options: string[];
          correctOptionIndex: number;
          explanation: string;
        }) => ({
          assessmentId,
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
        })
      ),
    });

    const priorCount = await prisma.quizAttempt.count({
      where: { userId: user.id, assessmentId },
    });

    // §6: also write QuizAttempt on retest
    const retestAttempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        assessmentId,
        score: lastScore,
        weakTopics,
        attemptNumber: priorCount + 1,
      },
    });

    const updated = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });

    return NextResponse.json({
      assessment: updated,
      weakTopics,
      quizAttempt: retestAttempt,
      attemptNumber: retestAttempt.attemptNumber,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Retest generation failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
