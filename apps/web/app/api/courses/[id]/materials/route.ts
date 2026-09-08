import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { requireRoles } from "@/lib/rbac";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { chunkText } from "@/lib/chunking";
import { embedText } from "@/lib/embeddings";
import { deleteChunksForSource, insertDocumentChunk } from "@/lib/retrieval";

/**
 * POST /api/courses/[id]/materials
 * ADMIN/TRAINER upload .txt/.pdf → extract → chunk → embed → DocumentChunk
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  const forbidden = requireRoles(user, ["ADMIN", "TRAINER"]);
  if (forbidden) return forbidden;

  const { id: courseId } = await params;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only .txt and .pdf uploads are supported" },
        { status: 400 }
      );
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./uploads", courseId);
    await mkdir(uploadDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const diskPath = path.join(uploadDir, `${Date.now()}-${safeName}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(diskPath, buffer);

    let extractedText = "";
    if (name.endsWith(".txt")) {
      extractedText = buffer.toString("utf-8");
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text ?? "";
      } catch {
        return NextResponse.json(
          {
            error: "PDF parsing failed. Upload a .txt file instead. File was saved to disk.",
            savedPath: diskPath,
          },
          { status: 422 }
        );
      }
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: "No text could be extracted" }, { status: 400 });
    }

    const chunks = chunkText(extractedText);
    await deleteChunksForSource("COURSE_MATERIAL", courseId);

    let embedded = 0;
    for (const chunk of chunks) {
      try {
        const embedding = await embedText(chunk.content);
        await insertDocumentChunk({
          sourceType: "COURSE_MATERIAL",
          sourceId: courseId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding,
        });
        embedded++;
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`[materials] chunk ${chunk.chunkIndex} embed failed:`, err);
        await prisma.documentChunk.create({
          data: {
            sourceType: "COURSE_MATERIAL",
            sourceId: courseId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      courseId,
      savedPath: diskPath,
      chunkCount: chunks.length,
      embeddedCount: embedded,
      charCount: extractedText.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
