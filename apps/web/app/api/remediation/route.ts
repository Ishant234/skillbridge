import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { embedText } from "@/lib/embeddings";
import { findSimilarCourses, findSimilarChunks } from "@/lib/retrieval";
import { z } from "zod";

const schema = z.object({ quizAttemptId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { quizAttemptId } = schema.parse(await req.json());

    const attempt = await prisma.quizAttempt.findUnique({ where: { id: quizAttemptId } });
    if (!attempt || attempt.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const weakTopics =
      attempt.weakTopics.length > 0 ? attempt.weakTopics : ["general review"];

    // RAG: courses + course-material chunks per weak topic
    const courseMap = new Map<
      string,
      { id: string; title: string; skillTags: string[] }
    >();
    const retrievedContext: { topic: string; chunks: string[] }[] = [];

    for (const topic of weakTopics.slice(0, 5)) {
      try {
        const emb = await embedText(topic);
        const courses = await findSimilarCourses(emb, 5);
        for (const c of courses) {
          courseMap.set(c.id, { id: c.id, title: c.title, skillTags: c.skillTags });
        }
        const chunks = await findSimilarChunks(emb, "COURSE_MATERIAL", undefined, 3);
        retrievedContext.push({
          topic,
          chunks: chunks.map((ch) => ch.content),
        });
      } catch (ragErr) {
        console.warn(`[Remediation] RAG failed for topic "${topic}":`, ragErr);
      }
    }

    let candidateCourses = Array.from(courseMap.values());
    if (candidateCourses.length === 0) {
      const fallback = await prisma.course.findMany({ take: 10 });
      candidateCourses = fallback.map((c) => ({
        id: c.id,
        title: c.title,
        skillTags: c.skillTags,
      }));
    }

    const engineUrl = process.env.REMEDIATION_ENGINE_URL ?? "http://localhost:8004";
    const res = await fetchWithRetry(`${engineUrl}/recommend-remediation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        quizAttempt: { score: attempt.score, weakTopics: attempt.weakTopics },
        candidateCourses,
        retrievedContext,
      }),
      timeoutMs: 90000,
    });

    if (!res.ok) throw new Error(`Engine ${res.status}`);
    const result = await res.json();

    for (const m of result.modulesToRedo) {
      await prisma.recommendation.create({
        data: {
          userId: user.id,
          courseId: m.courseId,
          score: m.priority === "high" ? 0.9 : m.priority === "medium" ? 0.6 : 0.3,
          reason: m.reason,
          generatedBy: "REMEDIATION_ENGINE",
        },
      });
    }

    return NextResponse.json({ modulesToRedo: result.modulesToRedo });
  } catch (err) {
    console.error("[Remediation] Engine failed:", err);
    return NextResponse.json(
      { error: "Remediation service temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
