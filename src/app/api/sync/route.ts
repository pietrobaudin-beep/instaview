import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { ingestSnapshot, type BridgePayload } from "@/lib/ingest";

const log = logger.scope("api:sync");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const userSchema = z.object({
  username: z.string().min(1),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  isVerified: z.boolean().optional(),
});

const bodySchema = z.object({
  profile: z.object({
    username: z.string().min(1),
    displayName: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    followersCount: z.number().optional(),
    followingCount: z.number().optional(),
    postsCount: z.number().optional(),
    isVerified: z.boolean().optional(),
    isPrivate: z.boolean().optional(),
  }),
  followers: z.array(userSchema).max(200000),
  following: z.array(userSchema).max(200000),
  truncated: z.boolean().optional(),
});

/**
 * Receives a follower snapshot pushed by the /receive bridge page (same-origin,
 * authenticated by the InstaView session). Stores it and returns a summary.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  try {
    const payload: BridgePayload = {
      profile: {
        username: parsed.data.profile.username,
        displayName: parsed.data.profile.displayName ?? null,
        avatarUrl: parsed.data.profile.avatarUrl ?? null,
        followersCount: parsed.data.profile.followersCount ?? 0,
        followingCount: parsed.data.profile.followingCount ?? 0,
        postsCount: parsed.data.profile.postsCount ?? 0,
        isVerified: parsed.data.profile.isVerified ?? false,
        isPrivate: parsed.data.profile.isPrivate ?? false,
      },
      followers: parsed.data.followers.map((u) => ({
        username: u.username,
        displayName: u.displayName ?? null,
        avatarUrl: u.avatarUrl ?? null,
        isVerified: u.isVerified ?? false,
      })),
      following: parsed.data.following.map((u) => ({
        username: u.username,
        displayName: u.displayName ?? null,
        avatarUrl: u.avatarUrl ?? null,
        isVerified: u.isVerified ?? false,
      })),
      truncated: parsed.data.truncated,
    };

    const result = await ingestSnapshot(user.id, payload);
    return NextResponse.json(result);
  } catch (e) {
    log.error("sync failed", { error: e });
    return NextResponse.json({ error: "Could not process snapshot" }, { status: 500 });
  }
}
