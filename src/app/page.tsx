import Link from "next/link";
import { Activity, Bell, LineChart, UserPlus } from "lucide-react";
import { TrackForm } from "@/components/track-form";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";

const FEATURES = [
  {
    icon: UserPlus,
    title: "Who started following",
    body: "Snapshot-based detection surfaces every new follower with the exact time it was spotted.",
  },
  {
    icon: LineChart,
    title: "Growth history",
    body: "Followers gained across 24h, 7d, 30d and 90d, with average/day and growth rate.",
  },
  {
    icon: Bell,
    title: "Alerts (ready)",
    body: "Email, webhook, Telegram and Discord channels wired into the schema — flip them on when you need.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Activity className="h-5 w-5 text-accent" />
          InstaView
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90"
          >
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-16 text-center sm:pt-24">
          {env.INSTAGRAM_PROVIDER === "mock" && (
            <Badge variant="accent" className="mb-6">
              Demo mode · simulated data (MockProvider)
            </Badge>
          )}
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            See who started following an Instagram account
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Enter any @username. InstaView watches the profile over time and tells you exactly who
            started following — and when.
          </p>
          <div className="mt-8 flex justify-center">
            <TrackForm />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No Instagram password needed. We never ask for your credentials.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-card p-6">
            <f.icon className="h-5 w-5 text-accent" />
            <h3 className="mt-4 font-medium">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          InstaView · follower monitoring · built with the InstagramDataProvider abstraction.
        </div>
      </footer>
    </main>
  );
}
