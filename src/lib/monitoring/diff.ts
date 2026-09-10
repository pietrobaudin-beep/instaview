/**
 * Pure snapshot-diff logic. No I/O — trivially unit-testable.
 *
 * Given the previously-known follower usernames and the freshly-observed list,
 * compute who newly FOLLOWED and who UNFOLLOWED.
 *
 * ⚠️ Correctness note on UNFOLLOW detection:
 *   In "head" mode we only see the most-recent slice of the follower list, so an
 *   account missing from the current slice may simply have scrolled below the
 *   window rather than unfollowed. UNFOLLOW is therefore only trustworthy when
 *   BOTH snapshots are "full", OR the missing account was inside the overlap
 *   region of a head snapshot. `computeDiff` reports candidates; the caller
 *   passes `trustUnfollows` to decide whether to persist them.
 */
import type { FollowerEntry } from "@/lib/providers/types";

export interface DiffResult {
  added: FollowerEntry[];
  removed: string[]; // usernames
}

export function computeDiff(
  previousUsernames: Iterable<string>,
  current: FollowerEntry[],
): DiffResult {
  const prev = new Set(previousUsernames);
  const curr = new Set(current.map((f) => f.username));

  const added = current.filter((f) => !prev.has(f.username));
  const removed: string[] = [];
  for (const u of prev) {
    if (!curr.has(u)) removed.push(u);
  }

  return { added, removed };
}

/**
 * Whether UNFOLLOWs can be trusted for this pair of snapshots.
 * Only when the new snapshot captured the full list (or the previous one did).
 */
export function canTrustUnfollows(
  previousMode: "head" | "full",
  currentMode: "head" | "full",
): boolean {
  return previousMode === "full" || currentMode === "full";
}
