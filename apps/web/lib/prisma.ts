// lib/prisma.ts — Singleton Prisma client for Next.js
// Prisma 7 requires a driver adapter for database connections.

import net from "node:net";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Neon publishes AAAA records, but this host has no working IPv6 route.
// Node's happy-eyeballs then stalls on IPv6 and OAuth/DB calls time out.
if (typeof net.setDefaultAutoSelectFamily === "function") {
  net.setDefaultAutoSelectFamily(false);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Return a client that will fail at query time but won't crash at import time
    // This allows the build to succeed even without DATABASE_URL set
    return new PrismaClient() as PrismaClient;
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
