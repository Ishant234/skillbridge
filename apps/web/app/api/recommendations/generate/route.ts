import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { embedText } from "@/lib/embeddings";
import { findSimilarCourses } from "@/lib/retrieval";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scores = await prisma.competencyScore.findMany({ where: { userId: user.id } });
  const domainGaps = scores
    .filter((s) => s.gap > 0)
    .map((s) => ({ domain: s.domain, skillName: s.skillName, gap: s.gap }));

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });
  const learningHistory = enrollments.map((e) => e.courseId);

  const fallbackRecs = await prisma.recommendation.findMany({
    where: { userId: user.id, generatedBy: "INITIAL_ENGINE" },
    include: { course: true },
    orderBy: { score: "desc" },
    take: 10,
  });

  // RAG: embed gaps → top-10 similar courses (never full catalogue)
  let candidateCourses: {
    id: string;
    title: string;
    description: string;
    domain: string;
    skillTags: string[];
  }[] = [];

  try {
    const gapQuery =
      domainGaps.length > 0
        ? domainGaps.map((g) => `${g.domain} ${g.skillName} gap ${g.gap}`).join("; ")
        : "general professional development statistics technical skills";
    const queryEmbedding = await embedText(gapQuery);
    const similar = await findSimilarCourses(queryEmbedding, 10);
    candidateCourses = similar.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      domain: c.domain,
      skillTags: c.skillTags,
    }));
  } catch (ragErr) {
    console.warn("[Recommendations] Course RAG failed, falling back to recent courses:", ragErr);
    const fallbackCourses = await prisma.course.findMany({ take: 10, orderBy: { createdAt: "desc" } });
    candidateCourses = fallbackCourses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      domain: c.domain,
      skillTags: c.skillTags,
    }));
  }

  if (candidateCourses.length === 0) {
    return NextResponse.json({
      recommendations: fallbackRecs,
      fromCache: true,
      warning: "No candidate courses available for ranking.",
    });
  }

  try {
    const engineUrl = process.env.RECOMMENDATION_ENGINE_URL ?? "http://localhost:8002";
    const res = await fetchWithRetry(`${engineUrl}/recommend-courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        domainGaps:
          domainGaps.length > 0
            ? domainGaps
            : scores.slice(0, 3).map((s) => ({
                domain: s.domain,
                skillName: s.skillName,
                gap: Math.max(s.gap, 5),
              })),
        candidateCourses,
        learningHistory,
      }),
      timeoutMs: 90000,
    });

    if (!res.ok) throw new Error(`Engine returned ${res.status}`);
    const result = await res.json();

    await prisma.recommendation.deleteMany({
      where: { userId: user.id, generatedBy: "INITIAL_ENGINE" },
    });

    for (const r of result.recommendations) {
      await prisma.recommendation.create({
        data: {
          userId: user.id,
          courseId: r.courseId,
          score: r.score,
          reason: r.reason,
          generatedBy: "INITIAL_ENGINE",
        },
      });
    }

    const freshRecs = await prisma.recommendation.findMany({
      where: { userId: user.id, generatedBy: "INITIAL_ENGINE" },
      include: { course: true },
      orderBy: { score: "desc" },
    });

    return NextResponse.json({ recommendations: freshRecs, fromCache: false });
  } catch (err) {
    console.error("[Recommendations] Engine call failed, returning cached:", err);
    return NextResponse.json({
      recommendations: fallbackRecs,
      fromCache: true,
      warning: "Recommendations are temporarily unavailable — showing last saved results.",
    });
  }
}
