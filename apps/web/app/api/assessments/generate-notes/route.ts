import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/fetchWithRetry";
import { getUserFromRequest } from "@/lib/auth";
import { requireRoles, isStaff } from "@/lib/rbac";
import { embedText } from "@/lib/embeddings";
import { findSimilarChunks } from "@/lib/retrieval";
import { isLargeDocument } from "@/lib/chunking";
import { z } from "zod";

const schema = z.object({
  extractedText: z.string().min(10).optional(),
  courseId: z.string().optional(),
  topic: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const forbidden = requireRoles(user, ["ADMIN", "TRAINER", "OFFICIAL"]);
  if (forbidden) return forbidden;

  try {
    const body = schema.parse(await req.json());
    const engineUrl = process.env.ASSESSMENT_ENGINE_URL ?? "http://localhost:8003";

    let extractedText: string | null = body.extractedText ?? null;
    let retrievedChunks: string[] = [];

    // Same strategy as MCQs (§5/§6): large doc → retrieve chunks; or courseId-only → retrieve
    if (extractedText && isLargeDocument(extractedText)) {
      try {
        const query = body.topic ?? body.title ?? "key concepts summary";
        const emb = await embedText(query);
        const chunks = await findSimilarChunks(emb, "COURSE_MATERIAL", body.courseId, 8);
        retrievedChunks = chunks.map((c) => c.content);
        extractedText = null;
      } catch {
        extractedText = extractedText!.slice(0, 14000);
      }
    } else if (!extractedText) {
      try {
        const query = body.topic ?? body.title ?? "course study notes";
        const emb = await embedText(query);
        const chunks = await findSimilarChunks(emb, "COURSE_MATERIAL", body.courseId, 8);
        retrievedChunks = chunks.map((c) => c.content);
      } catch {
        /* ignore */
      }
    }

    if (!extractedText && retrievedChunks.length === 0) {
      return NextResponse.json(
        { error: "Provide extractedText or ensure course material chunks exist for courseId." },
        { status: 400 }
      );
    }

    const res = await fetchWithRetry(`${engineUrl}/generate-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedText, retrievedChunks }),
      timeoutMs: 90000,
    });

    if (!res.ok) throw new Error(`Engine ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ ...data, generatedByStaff: user ? isStaff(user.role) : false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Notes generation temporarily unavailable";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
