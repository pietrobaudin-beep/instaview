import { HikerApiProvider } from "../src/lib/providers/hiker-provider";

const p = new HikerApiProvider({
  apiKey: process.env.HIKERAPI_KEY!,
  baseUrl: "https://api.hikerapi.com",
  defaultPageSize: 50,
});

const handle = process.argv[2] ?? "nasa";

(async () => {
  console.log(`Testing HikerAPI with @${handle}...\n`);
  const prof = await p.getProfile(handle);
  console.log("PROFILE (real):");
  console.log(`  @${prof.username} — ${prof.displayName}`);
  console.log(`  followers: ${prof.followersCount.toLocaleString()} | following: ${prof.followingCount} | posts: ${prof.postsCount}`);
  console.log(`  verified: ${prof.isVerified} | private: ${prof.isPrivate}`);
  console.log(`  avatar: ${prof.avatarUrl?.slice(0, 60)}...\n`);

  const f = await p.getFollowers(handle, { maxPages: 1 });
  console.log(`FOLLOWERS (real): got ${f.followers.length}, mode=${f.mode}`);
  for (const x of f.followers.slice(0, 5)) {
    console.log(`  @${x.username} — ${x.displayName}${x.isVerified ? " ✓" : ""}`);
  }
})().catch((e) => {
  console.error("ERROR:", e?.code ?? "", e?.message ?? e);
  process.exit(1);
});
