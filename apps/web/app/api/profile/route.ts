import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { embedText } from "@/lib/embeddings";
import { findSimilarChunks } from "@/lib/retrieval";
import { findSimilarCourses } from "@/lib/retrieval";
import { z } from "zod";

const profileSchema = z.object({
  designation: z.string().min(1),
  department: z.string().min(1),
  jobRole: z.string().min(1),
  currentAssignment: z.string().min(1),
  education: z.string().optional(),
  workExperience: z.string().optional(),
  priorTrainings: z.string().optional(),
});

async function generateRecommendationsForUser(userId: string) {
  const scores = await prisma.competencyScore.findMany({ where: { userId } });
  let domainGaps = scores
    .filter((s) => s.gap > 0)
    .map((s) => ({ domain: s.domain, skillName: s.skillName, gap: s.gap }));

  // §5: even with zero gaps, still offer general development picks
  if (domainGaps.length === 0) {
    domainGaps = scores.slice(0, 3).map((s) => ({
      domain: s.domain,
      skillName: s.skillName,
      gap: Math.max(s.gap, 5),
    }));
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { courseId: true },
  });
  const learningHistory = enrollments.map((e) => e.courseId);

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
        : "professional development statistics technical digital governance";
    const queryEmbedding = await embedText(gapQuery);
    const similar = await findSimilarCourses(queryEmbedding, 10);
    candidateCourses = similar.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      domain: c.domain,
      skillTags: c.skillTags,
    }));
  } catch {
    const fallback = await prisma.course.findMany({ take: 10 });
    candidateCourses = fallback.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      domain: c.domain,
      skillTags: c.skillTags,
    }));
  }

  if (candidateCourses.length === 0) return { ok: false as const, warning: "No candidate courses" };

  const engineUrl = process.env.RECOMMENDATION_ENGINE_URL ?? "http://localhost:8002";
  const res = await fetchWithRetry(`${engineUrl}/recommend-courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, domainGaps, candidateCourses, learningHistory }),
    timeoutMs: 30000,
  });
  if (!res.ok) throw new Error(`Recommendation engine ${res.status}`);
  const result = await res.json();

  await prisma.recommendation.deleteMany({
    where: { userId, generatedBy: "INITIAL_ENGINE" },
  });
  for (const r of result.recommendations ?? []) {
    await prisma.recommendation.create({
      data: {
        userId,
        courseId: r.courseId,
        score: r.score,
        reason: r.reason,
        generatedBy: "INITIAL_ENGINE",
      },
    });
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ profile, role: user.role });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admins/trainers may still save a profile, but competency assessment is for officials
  try {
    const body = await req.json();
    const data = profileSchema.parse(body);

    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    });

    await prisma.user.update({ where: { id: user.id }, data: { profileCompleted: true } });

    if (user.role === "ADMIN" || user.role === "TRAINER") {
      return NextResponse.json({
        success: true,
        profile,
        redirectTo: "/admin",
        assessmentRan: false,
      });
    }

    const requiredCompetencies = await prisma.requiredCompetency.findMany({
      where: { jobRole: data.jobRole },
    });

    let assessmentOk = false;
    let assessmentWarning: string | undefined;
    let recommendationsWarning: string | undefined;

    if (requiredCompetencies.length > 0) {
      const frameworkContext: { skillName: string; referenceText: string[] }[] = [];
      try {
        for (const rc of requiredCompetencies) {
          const queryEmbedding = await embedText(`${rc.domain} ${rc.skillName} competency levels`);
          const chunks = await findSimilarChunks(queryEmbedding, "COMPETENCY_FRAMEWORK", undefined, 3);
          frameworkContext.push({
            skillName: rc.skillName,
            referenceText: chunks.map((c) => c.content),
          });
        }
      } catch (ragErr) {
        console.warn("[Profile API] Framework RAG skipped:", ragErr);
        assessmentWarning = "Framework RAG unavailable — assessment may be less grounded.";
      }

      try {
        const engineUrl = process.env.COMPETENCY_ENGINE_URL ?? "http://localhost:8001";
        const res = await fetchWithRetry(`${engineUrl}/assess-competency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            jobRole: data.jobRole,
            profileText: {
              currentAssignment: data.currentAssignment,
              education: data.education ?? "",
              workExperience: data.workExperience ?? "",
              priorTrainings: data.priorTrainings ?? "",
            },
            requiredCompetencies: requiredCompetencies.map((rc) => ({
              domain: rc.domain,
              skillName: rc.skillName,
              requiredLevel: rc.requiredLevel,
            })),
            frameworkContext,
          }),
          timeoutMs: 60000,
        });

        if (!res.ok) {
          assessmentWarning = `AI Engine 1 returned ${res.status}`;
        } else {
          const assessment = await res.json();
          await prisma.competencyScore.deleteMany({ where: { userId: user.id } });
          if (assessment.domainScores?.length) {
            await prisma.competencyScore.createMany({
              data: assessment.domainScores.map(
                (ds: {
                  domain: string;
                  skillName: string;
                  currentLevel: number;
                  requiredLevel: number;
                  gap: number;
                }) => ({
                  userId: user.id,
                  domain: ds.domain as
                    | "STATISTICAL"
                    | "TECHNICAL"
                    | "DIGITAL_GOVERNANCE"
                    | "BEHAVIOURAL",
                  skillName: ds.skillName,
                  currentLevel: ds.currentLevel,
                  requiredLevel: ds.requiredLevel,
                  gap: ds.gap,
                })
              ),
            });
            assessmentOk = true;
          }
        }
      } catch (engineErr) {
        console.error("[Profile API] AI Engine 1 call failed:", engineErr);
        assessmentWarning = "AI Engine 1 temporarily unavailable. Profile saved; retry assessment later.";
      }

      // §5 Steps 3→4: kick off recommendations without blocking the profile response
      // (OpenRouter free models can be slow; don't leave the UI stuck on /profile)
      if (assessmentOk) {
        recommendationsWarning =
          "Recommendations are generating in the background — open Dashboard and tap Refresh AI Picks if needed.";
        void generateRecommendationsForUser(user.id)
          .then((rec) => {
            if (!rec.ok) {
              console.warn("[Profile API] Background recommendations:", rec.warning);
            } else {
              console.log("[Profile API] Background recommendations saved");
            }
          })
          .catch((recErr) => {
            console.error("[Profile API] Recommendation chain failed:", recErr);
          });
      }
    } else {
      assessmentWarning = `No competency matrix found for job role "${data.jobRole}".`;
    }

    return NextResponse.json({
      success: true,
      profile,
      redirectTo: "/dashboard",
      assessmentRan: assessmentOk,
      assessmentWarning,
      recommendationsRan: false,
      recommendationsWarning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
