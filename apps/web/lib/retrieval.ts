// lib/retrieval.ts — pgvector similarity search via raw SQL
// Prisma query builder does not support vector ops.

import { prisma } from "./prisma";
import { toVectorLiteral } from "./embeddings";
import type { CompetencyDomain, ChunkSourceType } from "@prisma/client";

export interface SimilarCourse {
  id: string;
  title: string;
  description: string;
  domain: CompetencyDomain;
  skillTags: string[];
  similarity: number;
}

export interface SimilarChunk {
  id: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Course similarity search against Course.embedding */
export async function findSimilarCourses(
  queryEmbedding: number[],
  topK = Number(process.env.RAG_TOP_K ?? 10)
): Promise<SimilarCourse[]> {
  const vector = toVectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRawUnsafe<SimilarCourse[]>(
    `
    SELECT id, title, description, domain, "skillTags",
           1 - (embedding <=> $1::vector) AS similarity
    FROM "Course"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2
    `,
    vector,
    topK
  );

  return rows;
}

/**
 * Document chunk similarity search, filtered by sourceType.
 * Optionally filter by sourceId (e.g. a specific course or skill).
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  sourceType: "COURSE_MATERIAL" | "COMPETENCY_FRAMEWORK",
  sourceId?: string,
  topK = 5
): Promise<SimilarChunk[]> {
  const vector = toVectorLiteral(queryEmbedding);

  if (sourceId) {
    return prisma.$queryRawUnsafe<SimilarChunk[]>(
      `
      SELECT id, "sourceType", "sourceId", "chunkIndex", content,
             1 - (embedding <=> $1::vector) AS similarity
      FROM "DocumentChunk"
      WHERE embedding IS NOT NULL
        AND "sourceType" = $2::"ChunkSourceType"
        AND "sourceId" = $3
      ORDER BY embedding <=> $1::vector
      LIMIT $4
      `,
      vector,
      sourceType,
      sourceId,
      topK
    );
  }

  return prisma.$queryRawUnsafe<SimilarChunk[]>(
    `
    SELECT id, "sourceType", "sourceId", "chunkIndex", content,
           1 - (embedding <=> $1::vector) AS similarity
    FROM "DocumentChunk"
    WHERE embedding IS NOT NULL
      AND "sourceType" = $2::"ChunkSourceType"
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    vector,
    sourceType,
    topK
  );
}

/** Persist a course embedding via raw SQL. */
export async function setCourseEmbedding(
  courseId: string,
  embedding: number[]
): Promise<void> {
  const vector = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "Course" SET embedding = $1::vector WHERE id = $2`,
    vector,
    courseId
  );
}

/** Insert a DocumentChunk row with embedding. */
export async function insertDocumentChunk(params: {
  sourceType: "COURSE_MATERIAL" | "COMPETENCY_FRAMEWORK";
  sourceId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
}): Promise<string> {
  const { createId } = await import("./cuid");
  const id = createId();
  const vector = toVectorLiteral(params.embedding);

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "DocumentChunk" (id, "sourceType", "sourceId", "chunkIndex", content, embedding, "createdAt")
    VALUES ($1, $2::"ChunkSourceType", $3, $4, $5, $6::vector, NOW())
    `,
    id,
    params.sourceType,
    params.sourceId,
    params.chunkIndex,
    params.content,
    vector
  );

  return id;
}

/** Delete all chunks for a given source (e.g. before re-upload). */
export async function deleteChunksForSource(
  sourceType: "COURSE_MATERIAL" | "COMPETENCY_FRAMEWORK",
  sourceId: string
): Promise<void> {
  await prisma.documentChunk.deleteMany({
    where: { sourceType, sourceId },
  });
}
