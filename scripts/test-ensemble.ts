import { EnsembleDataProvider } from "../src/lib/providers/ensembledata-provider";

const p = new EnsembleDataProvider({
  token: process.env.ENSEMBLEDATA_TOKEN!,
  baseUrl: "https://ensembledata.com/apis",
});

const handle = process.argv[2] ?? "nasa";

(async () => {
  console.log(`Testing EnsembleData with @${handle}...\n`);
  const prof = await p.getProfile(handle);
  console.log("PROFILE (real):");
  console.log(`  @${prof.username} — ${prof.displayName}`);
  console.log(`  followers: ${prof.followersCount.toLocaleString()} | following: ${prof.followingCount} | posts: ${prof.postsCount}`);
  console.log(`  verified: ${prof.isVerified} | private: ${prof.isPrivate}\n`);

  const f = await p.getFollowers(handle, { maxPages: 1 });
  console.log(`FOLLOWERS (real): got ${f.followers.length}, mode=${f.mode}`);
  for (const x of f.followers.slice(0, 5)) {
    console.log(`  @${x.username} — ${x.displayName}${x.isVerified ? " ✓" : ""}`);
  }
})().catch((e) => {
  console.error("ERROR:", e?.code ?? "", e?.message ?? e);
  process.exit(1);
});
