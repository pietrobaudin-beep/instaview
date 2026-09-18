import { notFound, redirect } from "next/navigation";
import { AppNav, NavSpacer } from "@/components/app-nav";
import { TrackingSettings } from "@/components/tracking-settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrefs } from "@/lib/tracking-prefs";
import { normalizeUsername } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: { username: string } }) {
  const username = normalizeUsername(decodeURIComponent(params.username));
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/rastros/${encodeURIComponent(username)}`);

  const profile = await prisma.trackedProfile.findUnique({
    where: { userId_username: { userId: user.id, username } },
  });
  if (!profile) notFound();

  return (
    <>
      <AppNav />
      <TrackingSettings
        username={profile.username}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        initial={readPrefs(profile.trackingPrefs)}
        active={profile.status === "ACTIVE"}
      />
      <NavSpacer />
    </>
  );
}
