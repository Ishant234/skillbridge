// lib/cuid.ts — Lightweight id generator for raw SQL inserts
import { randomBytes } from "crypto";

/** Generate a cuid-like id (timestamp + random). */
export function createId(): string {
  const time = Date.now().toString(36);
  const rand = randomBytes(8).toString("hex");
  return `c${time}${rand}`;
}
