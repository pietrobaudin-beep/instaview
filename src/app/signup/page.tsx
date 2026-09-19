import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Signing up and signing in are the same thing now: the first code creates the
 * account. Old links to /signup keep working and keep where they were going.
 */
export default function SignupPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const qs = new URLSearchParams();
  for (const key of ["next", "username"]) {
    const v = searchParams[key];
    if (v) qs.set(key, v);
  }
  const s = qs.toString();
  redirect(s ? `/login?${s}` : "/login");
}
