/**
 * Seed script — populates a demo user with tracked profiles that already have
 * ~7 days of simulated collection history, so the dashboard is alive on first
 * run. It reuses the MockProvider with an advancing clock and the same diff
 * logic the real collector uses.
 *
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { MockProvider } from "../src/lib/providers/mock-provider";
import { computeDiff } from "../src/lib/monitoring/diff";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@instaview.local";
const HANDLES = ["nasa", "natgeo"];
const DAYS = 7;
const CYCLE_HOURS = 6;
const INTERVAL_MINUTES = 120;

async function seedProfile(userId: string, username: string) {
  // Reset any prior data for a clean, repeatable seed.
  await prisma.trackedProfile.deleteMany({ where: { userId, username } });

  const now = Date.now();
  const startedAt = new Date(now - DAYS * 24 * 3600_000);

  const profile = await prisma.trackedProfile.create({
    data: {
      username,
      userId,
      monitoringStartedAt: startedAt,
      job: {
        create: {
          enabled: true,
          intervalMinutes: INTERVAL_MINUTES,
          nextRunAt: new Date(now + INTERVAL_MINUTES * 60_000),
        },
      },
    },
  });

  const cycles = (DAYS * 24) / CYCLE_HOURS;
  let prevUsernames: string[] = [];
  let latest: Awaited<ReturnType<MockProvider["getProfile"]>> | null = null;

  for (let i = 0; i <= cycles; i++) {
    const t = startedAt.getTime() + i * CYCLE_HOURS * 3600_000;
    const provider = new MockProvider(() => t);
    const profileData = await provider.getProfile(username);
    const { followers, mode } = await provider.getFollowers(username, { maxPages: 5, pageSize: 50 });
    latest = profileData;

    const { added } = computeDiff(prevUsernames, followers);
    const isBaseline = i === 0;

    const snapshot = await prisma.followerSnapshot.create({
      data: {
        profileId: profile.id,
        status: mode === "full" ? "SUCCESS" : "PARTIAL",
        mode,
        capturedCount: followers.length,
        followersCount: profileData.followersCount,
        newFollowerCount: isBaseline ? 0 : added.length,
        startedAt: new Date(t),
        completedAt: new Date(t),
      },
    });

    await prisma.follower.createMany({
      data: followers.map((f, idx) => ({
        profileId: profile.id,
        snapshotId: snapshot.id,
        username: f.username,
        displayName: f.displayName,
        avatarUrl: f.avatarUrl,
        isVerified: f.isVerified,
        position: idx,
        observedAt: new Date(t),
      })),
    });

    if (!isBaseline && added.length > 0) {
      await prisma.followerChange.createMany({
        data: added.map((f) => ({
          profileId: profile.id,
          snapshotId: snapshot.id,
          followerUsername: f.username,
          type: "FOLLOW" as const,
          displayName: f.displayName,
          avatarUrl: f.avatarUrl,
          isVerified: f.isVerified,
          detectedAt: new Date(t),
        })),
      });
    }

    prevUsernames = followers.map((f) => f.username);
  }

  if (latest) {
    await prisma.trackedProfile.update({
      where: { id: profile.id },
      data: {
        displayName: latest.displayName,
        avatarUrl: latest.avatarUrl,
        bio: latest.bio,
        isVerified: latest.isVerified,
        followersCount: latest.followersCount,
        followingCount: latest.followingCount,
        postsCount: latest.postsCount,
        lastCollectedAt: new Date(now),
      },
    });
  }

  console.log(`  seeded @${username} with ${cycles} cycles of history`);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: { email: DEMO_EMAIL, name: "Demo", plan: "PRO" },
    update: { plan: "PRO" },
  });
  console.log(`Seeding demo user ${user.email}...`);

  for (const handle of HANDLES) {
    await seedProfile(user.id, handle);
  }

  console.log("Done. Log in on the landing page (the demo user is auto-provisioned).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
