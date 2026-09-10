/**
 * Auth abstraction.
 *
 * AUTH_MODE=dev  -> passwordless cookie session for local development. The
 *                   cookie stores a signed user id; a dev login route upserts a
 *                   User by email and sets it.
 * AUTH_MODE=supabase -> replace `getCurrentUser` to read the Supabase session
 *                   (see README §Auth). The rest of the app only calls
 *                   getCurrentUser()/requireUser(), so nothing else changes.
 */
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";

const COOKIE = "iv_session";

function sign(value: string): string {
  const mac = createHmac("sha256", env.APP_SECRET).update(value).digest("hex").slice(0, 32);
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  if (sign(value) !== signed) return null;
  return value;
}

/** Set the session cookie for a user id. Call inside a route handler / action. */
export function setSessionCookie(userId: string) {
  cookies().set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = verify(cookies().get(COOKIE)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

/** Dev-only: upsert a user by email (used by the dev login route). */
export async function devSignIn(email: string, name?: string): Promise<User> {
  if (env.AUTH_MODE !== "dev") throw new Error("devSignIn is only available in AUTH_MODE=dev");
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: name ?? email.split("@")[0] },
    update: {},
  });
  setSessionCookie(user.id);
  return user;
}
