import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** Clear OTP JWT cookie. Client should also call next-auth signOut. */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return NextResponse.json({ success: true });
}
