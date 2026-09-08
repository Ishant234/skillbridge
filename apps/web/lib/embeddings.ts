// lib/embeddings.ts — Gemini embedding client (Next.js only)
// Model: gemini-embedding-001, truncated to 768 dims via MRL

import { fetchWithRetry } from "./fetchWithRetry";

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 768);

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

/**
 * Embed a single text string via Gemini. Returns a 768-dim float array.
 * Retries once on failure (via fetchWithRetry).
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, 8000) }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      timeoutMs: 15000,
    },
    1
  );

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini embed failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    embedding?: { values?: number[] };
  };

  const values = data.embedding?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini returned empty embedding");
  }

  // Ensure exact dimension (truncate or pad if needed)
  if (values.length > EMBEDDING_DIMENSIONS) {
    return values.slice(0, EMBEDDING_DIMENSIONS);
  }
  if (values.length < EMBEDDING_DIMENSIONS) {
    return [...values, ...new Array(EMBEDDING_DIMENSIONS - values.length).fill(0)];
  }
  return values;
}

/**
 * Embed many texts sequentially with a small delay to respect free-tier rate limits.
 */
export async function embedTextsThrottled(
  texts: string[],
  delayMs = 250
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await embedText(texts[i]));
    if (i < texts.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

/** Format a number[] as a pgvector literal string. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
