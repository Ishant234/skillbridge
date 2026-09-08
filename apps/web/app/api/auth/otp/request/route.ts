import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES ?? "5");
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Invalidate old OTPs
    await prisma.otpCode.updateMany({
      where: { email, consumed: false },
      data: { consumed: true },
    });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, authProvider: "EMAIL_OTP" },
      });
    }

    await prisma.otpCode.create({
      data: { email, code, expiresAt, userId: user.id },
    });

    // Send email (or log in dev)
    if (process.env.EMAIL_API_KEY && !process.env.EMAIL_API_KEY.startsWith("TODO")) {
      const resend = new Resend(process.env.EMAIL_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "noreply@example.com",
        to: email,
        subject: "Your login OTP — Skill Intelligence Platform",
        html: `<p>Your OTP is: <strong>${code}</strong>. It expires in ${expiryMinutes} minutes.</p>`,
      });
    } else {
      console.log(`\n[DEV OTP] ${email} → ${code}\n`);
    }

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
