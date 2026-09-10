"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  CircleDot,
  Loader2,
  Lock,
  Pause,
  Play,
  RefreshCw,
  ScanSearch,
  Sparkles,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { GrowthChart } from "@/components/dashboard/growth-chart";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ChangeItem, DashboardSummary, Period, SeriesPoint } from "@/lib/analytics";
import { cn, formatNumber } from "@/lib/utils";

interface DashboardData {
  locked: boolean;
  profile: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
    isPrivate: boolean;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    status: "ACTIVE" | "PAUSED" | "ERROR";
    captureFull: boolean;
    monitoringStartedAt: string;
    lastCollectedAt: string | null;
    lastError: string | null;
    intervalMinutes: number | null;
    nextRunAt: string | null;
  };
  period: Period;
  summary: DashboardSummary;
  series: SeriesPoint[];
  changes: ChangeItem[];
}

type Tab = "FOLLOW" | "UNFOLLOW" | "CURRENT";

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = React.useState<DashboardData>(initial);
  const [period, setPeriod] = React.useState<Period>(initial.period);
  const [tab, setTab] = React.useState<Tab>("CURRENT");
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(
    async (p: Period, t: Tab) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profiles/${initial.profile.id}?period=${p}&type=${t}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    },
    [initial.profile.id],
  );

  function changePeriod(p: Period) {
    setPeriod(p);
    load(p, tab);
  }
  function changeTab(t: Tab) {
    setTab(t);
    load(period, t);
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await fetch(`/api/profiles/${initial.profile.id}/refresh`, { method: "POST" });
      await load(period, tab);
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleMonitoring() {
    const enabled = data.profile.status !== "ACTIVE";
    await fetch(`/api/profiles/${initial.profile.id}/stop`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load(period, tab);
  }

  async function toggleFullCapture() {
    const enabled = !data.profile.captureFull;
    if (
      enabled &&
      !confirm(
        "Full capture fetches the ENTIRE follower list on each collection to detect unfollows. " +
          "This uses many more provider requests (roughly followers ÷ 100 per collection) and is " +
          "meant for small/medium accounts. Enable it for this profile?",
      )
    ) {
      return;
    }
    await fetch(`/api/profiles/${initial.profile.id}/full-capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await load(period, tab);
  }

  const p = data.profile;
  const s = data.summary;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All profiles
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Activity className="h-4 w-4 text-accent" /> InstaView
        </div>
      </div>

      {/* HEADER */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar src={p.avatarUrl} name={p.displayName ?? p.username} size={64} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">@{p.username}</h1>
                {p.isVerified && <BadgeCheck className="h-5 w-5 text-accent" />}
                <StatusBadge status={p.status} />
              </div>
              {p.displayName && <p className="text-sm text-muted-foreground">{p.displayName}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                Monitoring since{" "}
                {new Date(p.monitoringStartedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                {p.lastCollectedAt && (
                  <> · last check {formatDistanceToNow(new Date(p.lastCollectedAt))} ago</>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={p.captureFull ? "accent" : "outline"}
              size="sm"
              onClick={toggleFullCapture}
              title="Fetch the full follower list to detect unfollows (uses more requests)"
            >
              <ScanSearch className="h-4 w-4" />
              Full capture: {p.captureFull ? "On" : "Off"}
            </Button>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh now
            </Button>
            <Button
              variant={p.status === "ACTIVE" ? "outline" : "accent"}
              size="sm"
              onClick={toggleMonitoring}
            >
              {p.status === "ACTIVE" ? (
                <>
                  <Pause className="h-4 w-4" /> Stop monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start monitoring
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {p.lastError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Last collection error: {p.lastError}
        </div>
      )}

      {/* SUMMARY */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={UserPlus} label="New followers today" value={s.today} accent />
        <Stat icon={UserPlus} label="New this week" value={s.week} />
        <Stat icon={UserPlus} label="New this month" value={s.month} />
        <Stat icon={Users} label="Current followers" value={s.currentFollowers} format />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* MAIN */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-accent" /> Follower growth
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <GrowthChart data={data.series} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-semibold">
                  {tab === "FOLLOW"
                    ? "New Followers"
                    : tab === "UNFOLLOW"
                      ? "Unfollows"
                      : "Current followers"}
                </h2>
                <div className="flex gap-1 self-start rounded-lg bg-muted p-1 text-xs">
                  <TabBtn active={tab === "CURRENT"} onClick={() => changeTab("CURRENT")}>
                    Current
                  </TabBtn>
                  <TabBtn active={tab === "FOLLOW"} onClick={() => changeTab("FOLLOW")}>
                    New
                  </TabBtn>
                  <TabBtn active={tab === "UNFOLLOW"} onClick={() => changeTab("UNFOLLOW")}>
                    Unfollows
                  </TabBtn>
                </div>
              </div>
              <ChangeList changes={data.changes} tab={tab} locked={data.locked} />
              {tab === "UNFOLLOW" && !p.captureFull && (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Unfollow detection needs the full follower list. Turn on{" "}
                  <span className="font-medium text-foreground">Full capture</span> (top right) to
                  enable it for @{p.username}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR / FILTERS */}
        <aside className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Range
              </p>
              <div className="flex flex-col gap-1">
                {PERIODS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => changePeriod(opt.key)}
                    className={cn(
                      "rounded-md px-3 py-2 text-left text-sm transition-colors",
                      period === opt.key ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4">
              <SideStat label="Followers gained" value={`+${s.month}`} sub="last 30 days" />
              <SideStat label="Average new / day" value={String(s.avgPerDay)} sub="last 30 days" />
              <SideStat label="Growth rate" value={`${s.growthRatePct}%`} sub="last 30 days" />
              {s.lostToday > 0 && (
                <SideStat label="Unfollows today" value={`-${s.lostToday}`} sub="secondary" muted />
              )}
            </CardContent>
          </Card>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Following {formatNumber(p.followingCount)} · {formatNumber(p.postsCount)} posts
            {p.intervalMinutes && <> · checks every {p.intervalMinutes} min</>}
          </p>
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "PAUSED" | "ERROR" }) {
  if (status === "ACTIVE")
    return (
      <Badge variant="success">
        <CircleDot className="h-3 w-3" /> Monitoring
      </Badge>
    );
  if (status === "PAUSED") return <Badge variant="muted">Paused</Badge>;
  return <Badge variant="destructive">Error</Badge>;
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  format,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: boolean;
  format?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className={cn("h-4 w-4", accent && "text-accent")} />
          {label}
        </div>
        <div className="mt-2 text-3xl font-semibold tabular-nums">
          {format ? formatNumber(value) : accent && value > 0 ? `+${value}` : value}
        </div>
      </CardContent>
    </Card>
  );
}

function SideStat({
  label,
  value,
  sub,
  muted,
}: {
  label: string;
  value: string;
  sub: string;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", muted && "text-muted-foreground")}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

// Synthetic rows so the paywall always has something to blur (e.g. a freshly
// tracked profile whose only snapshot is the baseline).
const PLACEHOLDER_ROWS: ChangeItem[] = Array.from({ length: 6 }, (_, i) => ({
  id: `ph-${i}`,
  followerUsername: ["lucas.silva", "amanda.souza", "joao_pedro", "marina.costa", "rafael.dev", "bia.santos"][i],
  displayName: ["Lucas Silva", "Amanda Souza", "João Pedro", "Marina Costa", "Rafael Alves", "Beatriz Santos"][i],
  avatarUrl: null,
  isVerified: i % 3 === 0,
  type: "FOLLOW",
  detectedAt: new Date(Date.now() - (i + 1) * 17 * 60_000).toISOString(),
}));

function Row({ c, showEvent = true }: { c: ChangeItem; showEvent?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar src={c.avatarUrl} name={c.displayName ?? c.followerUsername} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">@{c.followerUsername}</span>
          {c.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" />}
        </div>
        {c.displayName && <p className="truncate text-sm text-muted-foreground">{c.displayName}</p>}
      </div>
      {showEvent && (
        <div className="shrink-0 text-right">
          <Badge variant={c.type === "FOLLOW" ? "success" : "destructive"}>
            {c.type === "FOLLOW" ? "Followed" : "Unfollowed"}
          </Badge>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(c.detectedAt), { addSuffix: true })}
          </p>
        </div>
      )}
    </li>
  );
}

function ChangeList({
  changes,
  tab,
  locked,
}: {
  changes: ChangeItem[];
  tab: Tab;
  locked: boolean;
}) {
  const showEvent = tab !== "CURRENT";

  // Paywall: blur the identities and gate them behind an upgrade CTA.
  if (locked) {
    const rows = changes.length > 0 ? changes.slice(0, 8) : PLACEHOLDER_ROWS;
    return (
      <div className="relative">
        <ul className="divide-y divide-border select-none blur-[6px]" aria-hidden>
          {rows.map((c) => (
            <Row key={c.id} c={c} showEvent={showEvent} />
          ))}
        </ul>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-background/40 to-background/90 p-6 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">
              {changes.length > 0
                ? `${changes.length} new follower${changes.length > 1 ? "s" : ""} in this range`
                : "New followers detected"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Unlock to reveal exactly <span className="text-foreground">who</span> started following
              — with names, photos and timestamps.
            </p>
          </div>
          <Link href="/pricing">
            <Button variant="accent" size="sm">
              <Sparkles className="h-4 w-4" /> Unlock — Upgrade to Pro
            </Button>
          </Link>
          <p className="text-[11px] text-muted-foreground">Cancel anytime · from $19/mo</p>
        </div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        {tab === "UNFOLLOW" ? <UserMinus className="h-6 w-6" /> : <UserPlus className="h-6 w-6" />}
        <p>
          {tab === "FOLLOW"
            ? "No new followers detected in this range yet."
            : tab === "UNFOLLOW"
              ? "No unfollows detected in this range."
              : "No followers captured yet — run a collection."}
        </p>
        {tab !== "CURRENT" && (
          <p className="max-w-xs text-xs">
            The first collection sets a baseline. New changes appear after the next check (or hit
            “Refresh now”).
          </p>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {changes.map((c) => (
        <Row key={c.id} c={c} showEvent={showEvent} />
      ))}
    </ul>
  );
}
