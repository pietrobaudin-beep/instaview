import Link from "next/link";
import { Activity, ChevronRight, CircleDot } from "lucide-react";
import { TrackForm } from "@/components/track-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getUserProfiles } from "@/lib/profiles";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const user = await getCurrentUser();
  const profiles = user ? await getUserProfiles(user.id) : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-accent" /> InstaView
        </Link>
        {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Tracked profiles</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add an Instagram @username to start detecting new followers.
      </p>

      <div className="mt-5">
        <TrackForm autoFocus={false} />
      </div>

      <div className="mt-8 space-y-3">
        {profiles.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No profiles yet. Track one above to see who starts following it.
            </CardContent>
          </Card>
        )}

        {profiles.map((p) => (
          <Link key={p.id} href={`/dashboard/${p.id}`}>
            <Card className="transition-colors hover:border-accent/50">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">@{p.username}</span>
                    {p.status === "ACTIVE" ? (
                      <Badge variant="success">
                        <CircleDot className="h-3 w-3" /> Monitoring
                      </Badge>
                    ) : p.status === "PAUSED" ? (
                      <Badge variant="muted">Paused</Badge>
                    ) : (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(p.followersCount)} followers
                    {p.lastCollectedAt && (
                      <> · last check {new Date(p.lastCollectedAt).toLocaleString()}</>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
