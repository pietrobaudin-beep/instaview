import { MockProvider } from "../src/lib/providers/mock-provider";
import { computeDiff } from "../src/lib/monitoring/diff";

const username = "empresa";
const HOUR = 3600_000;
let clock = Date.UTC(2026, 0, 1);
const provider = new MockProvider(() => clock);

async function snap() {
  const profile = await provider.getProfile(username);
  const { followers, mode } = await provider.getFollowers(username, { maxPages: 5, pageSize: 50 });
  return { profile, followers, mode };
}

(async () => {
  const s1 = await snap();
  console.log(`Baseline @${username}: ${s1.profile.followersCount} followers, head captured=${s1.followers.length}`);
  let prev = s1.followers.map((f) => f.username);

  let totalNew = 0;
  for (let cycle = 1; cycle <= 4; cycle++) {
    clock += 2 * HOUR;
    const s = await snap();
    const { added, removed } = computeDiff(prev, s.followers);
    totalNew += added.length;
    console.log(`\nCycle ${cycle} (+2h) — now ${s.profile.followersCount} followers`);
    console.log(`  NEW FOLLOWERS (${added.length}):`);
    for (const f of added.slice(0, 4)) console.log(`    @${f.username} — ${f.displayName}`);
    if (added.length > 4) console.log(`    ...and ${added.length - 4} more`);
    console.log(`  UNFOLLOWS: ${removed.length}`);
    prev = s.followers.map((f) => f.username);
  }

  const a = await provider.getFollowers(username, { maxPages: 1, pageSize: 3 });
  const b = await provider.getFollowers(username, { maxPages: 1, pageSize: 3 });
  const deterministic = JSON.stringify(a.followers) === JSON.stringify(b.followers);
  console.log(`\nEngine detected ${totalNew} new followers across 4 cycles.`);
  console.log(`Deterministic identities: ${deterministic}`);
})();
