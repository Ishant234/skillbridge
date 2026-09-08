import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { igotClient } from "@/lib/igot";
import { z } from "zod";

const schema = z.object({ courseId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { courseId } = schema.parse(await req.json());

    const existing = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId },
    });
    if (existing) {
      try {
        const status = await igotClient.getEnrollmentStatus(user.id, courseId);
        if (status && status.status !== existing.status) {
          const updated = await prisma.enrollment.update({
            where: { id: existing.id },
            data: {
              status: status.status,
              completedAt: status.status === "COMPLETED" ? new Date() : existing.completedAt,
            },
          });
          return NextResponse.json({ enrollment: updated, message: "Already enrolled (status synced)" });
        }
      } catch {
        /* ignore */
      }
      return NextResponse.json({ enrollment: existing, message: "Already enrolled" });
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId: user.id, courseId, status: "ENROLLED" },
    });

    try {
      await igotClient.pushEnrollment(user.id, courseId);
      const status = await igotClient.getEnrollmentStatus(user.id, courseId);
      if (status && status.status !== "ENROLLED") {
        const updated = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: status.status,
            completedAt: status.status === "COMPLETED" ? new Date() : null,
          },
        });
        return NextResponse.json({ enrollment: updated }, { status: 201 });
      }
    } catch {
      /* mocked */
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Enrollment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { enrolledAt: "desc" },
  });

  return NextResponse.json({ enrollments });
}
