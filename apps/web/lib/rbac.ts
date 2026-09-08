import { NextResponse } from "next/server";

export type AppRole = "OFFICIAL" | "ADMIN" | "TRAINER";

export function requireRoles(
  user: { role: string } | null,
  allowed: AppRole[]
): NextResponse | null {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!allowed.includes(user.role as AppRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function isStaff(role: string): boolean {
  return role === "ADMIN" || role === "TRAINER";
}
