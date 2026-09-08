import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { cookies } from "next/headers";
import { SignJWT } from "jose";

const schema = z.object({ email: z.string().email(), code: z.string().length(6) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = schema.parse(body);

    const otp = await prisma.otpCode.findFirst({
      where: { email, code, consumed: false, expiresAt: { gt: new Date() } },
    });

    if (!otp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, authProvider: "EMAIL_OTP" } });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me");
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      profileCompleted: user.profileCompleted,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role, profileCompleted: user.profileCompleted },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
