import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { requireRoles } from "@/lib/rbac";
import { embedText } from "@/lib/embeddings";
import { findSimilarChunks } from "@/lib/retrieval";
import { isLargeDocument } from "@/lib/chunking";
import { z } from "zod";

const schema = z.object({
  courseId: z.string(),
  title: z.string(),
  extractedText: z.string().min(10).optional(),
  topic: z.string().optional(),
  numQuestions: z.number().min(1).max(20).default(10),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  // §5 Step 8: admin/trainer can trigger; officials allowed for demo enrollments path
  const forbidden = requireRoles(user, ["ADMIN", "TRAINER", "OFFICIAL"]);
  if (forbidden) return forbidden;

  try {
    const body = schema.parse(await req.json());
    const engineUrl = process.env.ASSESSMENT_ENGINE_URL ?? "http://localhost:8003";

    let extractedText: string | null = body.extractedText ?? null;
    let retrievedChunks: string[] = [];

    if (extractedText && isLargeDocument(extractedText)) {
      try {
        const query = body.topic ?? body.title;
        const emb = await embedText(query);
        const chunks = await findSimilarChunks(emb, "COURSE_MATERIAL", body.courseId, 8);
        retrievedChunks = chunks.map((c) => c.content);
        extractedText = null;
      } catch (ragErr) {
        console.warn("[generate-mcqs] Large-doc RAG failed, truncating text:", ragErr);
        extractedText = extractedText!.slice(0, 12000);
      }
    } else if (!extractedText) {
      try {
        const query = body.topic ?? body.title;
        const emb = await embedText(query);
        const chunks = await findSimilarChunks(emb, "COURSE_MATERIAL", body.courseId, 8);
        retrievedChunks = chunks.map((c) => c.content);
      } catch {
        /* ignore */
      }
    }

    if (!extractedText && retrievedChunks.length === 0) {
      return NextResponse.json(
        { error: "No course material available. Upload material or provide extractedText." },
        { status: 400 }
      );
    }

    const res = await fetchWithRetry(`${engineUrl}/generate-mcqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extractedText,
        retrievedChunks,
        numQuestions: body.numQuestions,
      }),
      timeoutMs: 90000,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Engine returned ${res.status}: ${errBody.slice(0, 200)}`);
    }
    const payload = await res.json();
    const questions = payload.questions ?? [];
    if (!questions.length) {
      return NextResponse.json(
        { error: "Engine returned no questions. Paste more course text and try again." },
        { status: 502 }
      );
    }

    const assessment = await prisma.assessment.create({
      data: {
        courseId: body.courseId,
        title: body.title,
        createdBy: user!.id,
        questions: {
          create: questions.map(
            (q: {
              questionText: string;
              options: string[];
              correctOptionIndex: number;
              explanation: string;
            }) => ({
              questionText: q.questionText,
              options: q.options,
              correctOptionIndex: q.correctOptionIndex,
              explanation: q.explanation,
            })
          ),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "MCQ generation temporarily unavailable";
    console.error("[generate-mcqs]", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
