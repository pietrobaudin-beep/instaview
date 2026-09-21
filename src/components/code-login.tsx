"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Mascot } from "@/components/ui/mascot";
import { StickerNote } from "@/components/ui/doodles";
import { safeNext } from "@/lib/utils";
import { BRAND } from "@/lib/voice";

type Channel = "email" | "whatsapp";
type Step = "target" | "code" | "name";

/**
 * Sign in without a password: type an email or WhatsApp number, get a 6-digit
 * code, type it — and the account exists. The name is asked once, optionally.
 */
export function CodeLogin({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const username = params.get("username");

  const [step, setStep] = React.useState<Step>("target");
  const [channel, setChannel] = React.useState<Channel>(channels[0] ?? "email");
  const [target, setTarget] = React.useState("");
  const [sentTo, setSentTo] = React.useState("");
  const [devCode, setDevCode] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [cooldown, setCooldown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [novaConta, setNovaConta] = React.useState(false);

  // Resend countdown.
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  function done() {
    const dest = next ?? (username ? `/p/${encodeURIComponent(username)}` : "/");
    router.push(dest);
    router.refresh();
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { res, data } = await post("/api/auth/code/request", { channel, target });
      if (!res.ok) {
        setError(data.error ?? "Não deu para enviar o código.");
        if (data.retryInSec) setCooldown(data.retryInSec);
        return;
      }
      setSentTo(data.sentTo);
      setDevCode(data.devCode ?? null);
      setCode("");
      setCooldown(60);
      setStep("code");
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(value: string) {
    setLoading(true);
    setError(null);
    try {
      const { res, data } = await post("/api/auth/code/verify", { channel, target, code: value });
      if (!res.ok) {
        setError(data.error ?? "Código inválido.");
        setCode("");
        return;
      }
      // "Conta criada" só vale quando ela é nova de verdade. Quem já tinha
      // conta e nunca pôs o nome cai na mesma tela, com outro título.
      setNovaConta(!!data.isNew);
      if (data.needsName) setStep("name");
      else done();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  function onCodeChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !loading) verify(digits);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return done();
    setLoading(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } finally {
      setLoading(false);
      done();
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold tracking-tight" aria-label="Farejo">
        <Logo className="h-6" />
      </Link>
      <StickerNote className="mb-5 self-start" tone="pink">
        {BRAND.signature.toLowerCase()}
      </StickerNote>

      <Card className="rounded-3xl">
        <CardContent className="p-6">
          {step === "target" && (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Seu acesso ao Farejo</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Entre ou crie sua conta com um código. Sem senha.
              </p>

              {channels.length > 1 && (
                <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1" role="tablist">
                  {channels.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={channel === c}
                      onClick={() => {
                        setChannel(c);
                        setTarget("");
                        setError(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
                        channel === c ? "bg-card shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      {c === "email" ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                      {c === "email" ? "E-mail" : "WhatsApp"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={sendCode} className="mt-4 space-y-3">
                {channel === "email" ? (
                  <Input
                    key="email"
                    type="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    autoComplete="email"
                    required
                    autoFocus
                  />
                ) : (
                  <Input
                    key="whatsapp"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    autoComplete="tel"
                    required
                    autoFocus
                  />
                )}
                <Button type="submit" className="w-full" variant="accent" disabled={loading || cooldown > 0}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {cooldown > 0 ? `Aguarde ${cooldown}s` : "Receber código"}
                </Button>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Ao continuar, você concorda com os{" "}
                  <Link href="/termos" className="font-semibold text-vinho underline-offset-2 hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e com a{" "}
                  <Link href="/privacidade" className="font-semibold text-vinho underline-offset-2 hover:underline">
                    Política de Privacidade
                  </Link>
                  , e declara ter 18 anos ou mais.
                </p>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep("target");
                  setError(null);
                }}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> {channel === "email" ? "Trocar e-mail" : "Trocar número"}
              </button>
              <h1 className="text-2xl font-extrabold tracking-tight">Digite o código</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enviamos 6 números para <b className="text-foreground">{sentTo}</b>
                {channel === "whatsapp" ? " no WhatsApp" : ""}. Ele vale por 10 minutos.
              </p>

              {devCode && (
                <div className="mt-4 rounded-2xl border border-dashed border-accent/50 bg-pink/20 p-3 text-sm">
                  <b>Localhost:</b> nada foi enviado de verdade. Código de teste:{" "}
                  <button
                    type="button"
                    onClick={() => onCodeChange(devCode)}
                    className="font-mono font-bold tracking-widest text-vinho underline underline-offset-4"
                  >
                    {devCode}
                  </button>
                </div>
              )}

              <input
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="••••••"
                aria-label="Código de 6 números"
                disabled={loading}
                className="mt-5 h-16 w-full rounded-2xl border border-border bg-background text-center font-mono text-3xl font-bold tracking-[0.5em] outline-none transition focus:border-accent"
              />
              {loading && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Conferindo…
                </p>
              )}
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

              <button
                type="button"
                onClick={() => sendCode()}
                disabled={cooldown > 0 || loading}
                className="mt-5 text-sm font-semibold text-vinho underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Reenviar código"}
              </button>
            </>
          )}

          {step === "name" && (
            <>
              <Mascot pose="feliz" className="h-20 text-ink" bob />
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
                {novaConta ? "Conta criada! 🐶" : "Como podemos chamar você?"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {novaConta ? "Como podemos chamar você? " : ""}É opcional. Você pode mudar depois em
                Conta.
              </p>
              <form onSubmit={saveName} className="mt-5 space-y-3">
                <Input
                  placeholder="Seu nome ou apelido"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  autoFocus
                />
                <Button type="submit" className="w-full" variant="accent" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {name.trim() ? "Salvar e continuar" : "Continuar"}
                </Button>
                <button
                  type="button"
                  onClick={done}
                  className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Agora não
                </button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        O Farejo nunca pede senha, nem a sua nem a do Instagram.
      </p>
    </div>
  );
}
