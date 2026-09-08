import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scores = await prisma.competencyScore.findMany({
    where: { userId: user.id },
    orderBy: { assessedAt: "desc" },
  });

  const totalRequired = scores.reduce((s, c) => s + c.requiredLevel, 0);
  const totalGap = scores.reduce((s, c) => s + Math.max(c.gap, 0), 0);
  const overallReadiness = scores.length && totalRequired > 0
    ? Math.max(0, Math.round(100 - (totalGap / totalRequired) * 100))
    : null;

  return NextResponse.json({ scores, overallReadiness });
}
