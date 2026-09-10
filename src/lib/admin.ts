/**
 * Admin authorization helpers.
 *
 * An admin is any signed-in user whose email is in ADMIN_EMAILS. Because dev
 * auth is passwordless, logging in AS an admin additionally requires the
 * ADMIN_TOKEN secret (see /api/admin/login) — and /api/auth/dev refuses admin
 * emails so the public demo login can't impersonate an admin.
 */
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";

export function adminEmails(): string[] {
  return env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (user && isAdminEmail(user.email)) return user;
  return null;
}
