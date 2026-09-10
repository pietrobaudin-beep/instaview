"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const params = useSearchParams();
  const username = params.get("username");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isSignup = mode === "signup";
  const nextQuery = username ? `?username=${encodeURIComponent(username)}` : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(isSignup ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(isSignup ? { email, password, name } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      // If they arrived from the landing page with a handle, track it now.
      if (username) {
        const t = await fetch("/api/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const td = await t.json();
        if (t.ok) {
          router.push(`/dashboard/${td.id}`);
          return;
        }
      }
      router.push("/dashboard");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold tracking-tight">
        <Activity className="h-5 w-5 text-accent" /> InstaView
      </Link>
      <Card>
        <CardContent className="p-6">
          <h1 className="text-xl font-semibold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Start tracking who follows any Instagram profile."
              : "Log in to your InstaView dashboard."}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {isSignup && (
              <Input
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
            <Button type="submit" className="w-full" variant="accent" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "Create account" : "Log in"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href={`/login${nextQuery}`} className="text-accent hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href={`/signup${nextQuery}`} className="text-accent hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
