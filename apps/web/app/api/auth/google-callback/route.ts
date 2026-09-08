import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/nextauth";
import { prisma } from "@/lib/prisma";

/**
 * After Google OAuth via NextAuth, mint the same auth-token cookie used by OTP login
 * so all existing API routes keep working via getUserFromRequest.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login?error=google", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=nouser", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
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

  const dest = user.profileCompleted ? "/dashboard" : "/profile";
  return NextResponse.redirect(new URL(dest, process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
}
