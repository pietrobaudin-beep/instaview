/**
 * Localhost and the live site share one database, but localhost reads fake
 * data (the mock provider). These guards keep the two from mixing:
 *
 * - Provider answers are cached under the provider's name, so mock data can
 *   never be served on the live site (and vice versa).
 * - With the mock provider, history is only written for the test accounts
 *   (@farejo.test) — never for real people's tracked profiles.
 */
import { getProvider } from "@/lib/providers";

export const TEST_EMAIL_DOMAIN = "@farejo.test";

export function usingMockData(): boolean {
  return getProvider().name === "mock";
}

/** Whether this owner's history may be written with the current provider. */
export function mayRecordFor(ownerEmail: string | null | undefined): boolean {
  return !usingMockData() || !!ownerEmail?.endsWith(TEST_EMAIL_DOMAIN);
}

/** Cache key for a section, namespaced by where the data came from. */
export function cacheSectionKey(section: string): string {
  return `${getProvider().name}:${section}`;
}
