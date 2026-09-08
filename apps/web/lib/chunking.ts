// lib/chunking.ts — Sentence-aware text chunking for RAG
// ~500 tokens per chunk, ~50 token overlap (approx 4 chars/token)

const CHUNK_SIZE_TOKENS = Number(process.env.RAG_CHUNK_SIZE_TOKENS ?? 500);
const CHUNK_OVERLAP_TOKENS = Number(process.env.RAG_CHUNK_OVERLAP_TOKENS ?? 50);
const CHARS_PER_TOKEN = 4;

export interface TextChunk {
  chunkIndex: number;
  content: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Split text into sentences without cutting mid-sentence. */
function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Split on sentence-ending punctuation followed by whitespace/newline
  const parts = normalized.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

/**
 * Chunk text into ~CHUNK_SIZE_TOKENS pieces with ~CHUNK_OVERLAP_TOKENS overlap.
 * Never cuts mid-sentence.
 */
export function chunkText(text: string): TextChunk[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const maxChars = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const chunks: TextChunk[] = [];
  let current: string[] = [];
  let currentLen = 0;

  const flush = () => {
    if (current.length === 0) return;
    const content = current.join(" ").trim();
    if (content) {
      chunks.push({ chunkIndex: chunks.length, content });
    }
  };

  for (const sentence of sentences) {
    const sentenceLen = sentence.length + (current.length > 0 ? 1 : 0);

    // If a single sentence exceeds max, hard-split by paragraphs/words as last resort
    if (sentence.length > maxChars && current.length === 0) {
      for (let i = 0; i < sentence.length; i += maxChars - overlapChars) {
        const slice = sentence.slice(i, i + maxChars).trim();
        if (slice) chunks.push({ chunkIndex: chunks.length, content: slice });
      }
      continue;
    }

    if (currentLen + sentenceLen > maxChars && current.length > 0) {
      flush();

      // Build overlap from end of previous chunk
      const prev = chunks[chunks.length - 1]?.content ?? "";
      const overlapText = prev.slice(Math.max(0, prev.length - overlapChars));
      const overlapSentences = splitSentences(overlapText);
      current = overlapSentences.length > 0 ? overlapSentences : [];
      currentLen = current.join(" ").length;
    }

    current.push(sentence);
    currentLen += sentenceLen;
  }

  flush();
  return chunks;
}

export function estimateTokenCount(text: string): number {
  return estimateTokens(text);
}

export function isLargeDocument(text: string): boolean {
  const threshold = Number(process.env.LARGE_DOC_TOKEN_THRESHOLD ?? 6000);
  return estimateTokens(text) > threshold;
}
