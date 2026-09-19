/**
 * Auth.
 *
 * People sign in with a one-time code sent to their email or WhatsApp (see
 * lib/login-code) — no passwords. The session is a cookie holding the user id,
 * signed with APP_SECRET. The rest of the app only calls
 * getCurrentUser()/requireUser().
 *
 * On localhost there is also a dev login with test accounts (/api/auth/dev),
 * which refuses to run on a production build.
 */
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Channel } from "@/lib/login-code/targets";
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

/**
 * After a verified one-time code: the account for this email / WhatsApp
 * number, created on the spot the first time. The name comes later, if ever.
 */
export async function signInWithVerifiedTarget(
  channel: Channel,
  target: string,
): Promise<{ user: User; isNew: boolean }> {
  const where = channel === "email" ? { email: target } : { phone: target };
  let user = await prisma.user.findUnique({ where });
  let isNew = false;
  if (!user) {
    try {
      user = await prisma.user.create({ data: where });
      isNew = true;
    } catch {
      // Two tabs verifying at once: the other one created it first.
      user = await prisma.user.findUnique({ where });
      if (!user) throw new Error("could not create account");
    }
  }
  setSessionCookie(user.id);
  return { user, isNew };
}

/** Dev-only: upsert a user by email (used by the dev login route). */
export async function devSignIn(email: string, name?: string): Promise<User> {
  // Belt and braces with the route guard: never sign in without a password on a
  // production build, even if something else ends up calling this.
  if (process.env.NODE_ENV === "production" || env.AUTH_MODE !== "dev") {
    throw new Error("devSignIn is only available in local development");
  }
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: name ?? email.split("@")[0] },
    update: {},
  });
  setSessionCookie(user.id);
  return user;
}
