import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  profileCompleted: boolean;
};

/**
 * Resolve the current user from the auth-token cookie.
 * Reloads role/profileCompleted from the DB so ADMIN promotions take effect
 * without forcing a full re-login (JWT alone can go stale).
 */
export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get("auth-token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me");
    const { payload } = await jwtVerify(token, secret);
    const id = payload.id as string | undefined;
    const email = payload.email as string | undefined;
    if (!id || !email) return null;

    // Prefer live DB values for role / profileCompleted
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, profileCompleted: true },
      });
      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          profileCompleted: dbUser.profileCompleted,
        };
      }
    } catch {
      // Fall through to JWT claims if DB briefly unavailable
    }

    return {
      id,
      email,
      role: (payload.role as string) ?? "OFFICIAL",
      profileCompleted: Boolean(payload.profileCompleted),
    };
  } catch {
    return null;
  }
}
