"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { safeNext, withParam } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { StickerNote } from "@/components/ui/doodles";
import { BRAND } from "@/lib/voice";

export function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const params = useSearchParams();
  const username = params.get("username");
  const next = safeNext(params.get("next"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isSignup = mode === "signup";
  // Carry context between the login ⇄ signup toggle.
  const nextQuery = next
    ? withParam("", "next", next)
    : username
      ? `?username=${encodeURIComponent(username)}`
      : "";

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
      // Came from a purchase / profile page → go back there, logged in.
      if (next) {
        router.push(next);
        router.refresh();
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
        <Logo className="h-6" />
      </Link>
      <StickerNote className="mb-5 self-start" tone={isSignup ? "yellow" : "pink"}>
        {(isSignup ? BRAND.phrases.umArroba : BRAND.signature).toLowerCase()}
      </StickerNote>
      <Card className="rounded-3xl">
        <CardContent className="p-6">
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isSignup ? "Criar sua conta" : "Bem-vindo de volta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Comece a farejar qualquer perfil do Instagram."
              : "Entre para ver seus rastros."}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {isSignup && (
              <Input
                placeholder="Nome (opcional)"
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
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
            <Button type="submit" className="w-full" variant="accent" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "Criar conta" : "Entrar"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isSignup ? (
              <>
                Já tem conta?{" "}
                <Link href={`/login${nextQuery}`} className="text-accent hover:underline">
                  Entrar
                </Link>
              </>
            ) : (
              <>
                Novo por aqui?{" "}
                <Link href={`/signup${nextQuery}`} className="text-accent hover:underline">
                  Criar uma conta
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
