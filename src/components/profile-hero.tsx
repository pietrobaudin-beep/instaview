"use client";

import * as React from "react";
import { ArrowUpRight, BadgeCheck, Globe, Link as LinkIcon, Loader2, Lock, PawPrint, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/brand";
import { formatNumber } from "@/lib/utils";

/** Só o domínio: a URL inteira polui e às vezes é longa demais. */
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export interface HeroProfile {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  /** Link que a própria pessoa publicou na bio. */
  externalUrl?: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  analyzedAt?: string | null;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Profile card at the top of an analysis: photo in the pink ring, the three
 * Instagram counters, and the button that starts tracking the profile.
 *
 * Centred on a phone like the app screens; on desktop it lays out sideways so
 * the width is not wasted.
 */
/**
 * O mesmo @ em outra rede — só quando a conta existe de verdade.
 *
 * Quem verifica é o servidor (/api/elsewhere), e só entra na lista o que ele
 * confirma. TikTok e X são as duas redes checadas; o que não dá para confirmar
 * simplesmente não aparece.
 */
export function OtherNetworks({
  username,
  isPrivate,
  destaque = false,
}: {
  username: string;
  isPrivate?: boolean;
  /** No beco sem saída do perfil privado, o bloco vira a saída principal. */
  destaque?: boolean;
}) {
  type Elsewhere = {
    label: string;
    handle: string;
    url: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };

  const [links, setLinks] = React.useState<Elsewhere[]>([]);

  const [procurando, setProcurando] = React.useState(false);
  const [procurouPagas, setProcurouPagas] = React.useState(false);
  /** Quantas redes a busca paga acrescentou — 0 também é resposta, e aparece. */
  const [novas, setNovas] = React.useState(0);
  const [falhou, setFalhou] = React.useState(false);

  React.useEffect(() => {
    if (!isPrivate) return;
    let alive = true;
    fetch(`/api/elsewhere?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((b) => alive && setLinks(b.links ?? []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [username, isPrivate]);

  /**
   * As redes pagas, só quando pedidas.
   *
   * Cada consulta destas custa, então nada roda sozinho — e o resultado fica
   * 7 dias guardado.
   */
  async function procurarMais() {
    setProcurando(true);
    setFalhou(false);
    const antes = links.length;
    try {
      const r = await fetch(`/api/elsewhere?username=${encodeURIComponent(username)}&pagas=1`);
      if (!r.ok) throw new Error(String(r.status));
      const b = await r.json();
      const achados: Elsewhere[] = b.links ?? [];
      setLinks(achados);
      setNovas(achados.length - antes);
      setProcurouPagas(true);
    } catch {
      // Sem isto, falha e "não achei nada" ficavam iguais: o botão sumia e a
      // tela seguia idêntica.
      setFalhou(true);
    } finally {
      setProcurando(false);
    }
  }

  if (!isPrivate) return null;

  return (
    <div className={destaque ? "mt-6 w-full text-left" : "mt-4"}>
      {destaque && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-plum/50">
          O mesmo @ em outras redes
        </p>
      )}
      <div
        className={
          destaque
            ? "grid gap-2"
            : "flex flex-wrap justify-center gap-2 md:justify-start"
        }
      >
        {links.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noreferrer nofollow"
            className={`flex items-center gap-2.5 rounded-2xl border border-border bg-muted/50 py-2 pl-2 pr-3.5 transition hover:border-accent/40 ${
              destaque ? "min-h-[56px]" : ""
            }`}
          >
            {/* A foto real quando a rede publica uma (hoje, o Telegram). Onde
                não há via oficial para a imagem, fica a silhueta — melhor do
                que fingir que temos a foto. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink/40">
              {l.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={l.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <svg viewBox="0 0 48 48" className="h-full w-full text-vinho/35" aria-hidden>
                  <circle cx="24" cy="18" r="8" fill="currentColor" />
                  <path d="M8 44c0-8.8 7.2-14 16-14s16 5.2 16 14z" fill="currentColor" />
                </svg>
              )}
            </span>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-sm font-bold text-foreground">@{l.handle}</span>
              {/* O nome vem da própria rede, quando ela devolve. */}
              <span className="block truncate text-[11px] text-muted-foreground">
                {l.label}
                {l.displayName ? ` · ${l.displayName}` : ""}
              </span>
            </span>
            {destaque && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          </a>
        ))}
      </div>
      {destaque && !procurouPagas && (
        <button
          type="button"
          onClick={procurarMais}
          disabled={procurando}
          className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold transition hover:border-accent/50 disabled:opacity-60"
        >
          {procurando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {procurando ? "Procurando…" : "Procurar em mais redes"}
        </button>
      )}

      {/*
        * Depois de procurar, a tela precisa dizer o que houve. Antes, quando a
        * busca não trazia nada novo, o botão simplesmente sumia e nada mudava:
        * quem clicou esperava dez segundos sem saber se tinha buscado.
        */}
      {procurouPagas && novas === 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {links.length === 0
            ? "Não achamos esse @ em nenhuma outra rede."
            : "Procuramos também no TikTok e no YouTube: nada além do que já está aqui."}
        </p>
      )}

      {falhou && (
        <button
          type="button"
          onClick={procurarMais}
          className="mt-2 text-[11px] font-bold text-accent underline underline-offset-2"
        >
          A busca falhou. Tentar de novo
        </button>
      )}

      <p className={`mt-2 text-[11px] leading-relaxed text-muted-foreground ${destaque ? "" : "text-center md:text-left"}`}>
        {links.some((l) => !l.avatarUrl) ? "Onde não há foto, o desenho é ilustrativo. " : ""}
        Mesmo @ nessa rede — <b className="font-semibold">pode ser outra pessoa</b>.
      </p>
    </div>
  );
}

export function ProfileHero({
  profile,
  premium,
  note,
  tracking,
  onTrack,
  locked = false,
  tier,
  onVerStories,
}: {
  profile: HeroProfile;
  premium?: boolean;
  note?: string | null;
  tracking?: { saved: boolean; busy: boolean };
  onTrack?: () => void;
  /** Free plan: the button shows a lock and opens the Pro offer instead. */
  locked?: boolean;
  /** Which badge to show beside the name. */
  tier?: "free" | "single" | "pro";
  /**
   * Abre a aba de stories. A foto com anel é o lugar onde todo mundo procura
   * story — sem isto, ele ficava escondido atrás do seletor de seções.
   * Não pede nada ao provedor: só troca de aba.
   */
  onVerStories?: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      {premium && (
        <div className="h-1.5 w-full bg-gradient-to-r from-pink via-accent to-purple" />
      )}
      {/* Foto e identidade na mesma linha; números, bio e ação embaixo, em
          largura cheia. Empilhado e centralizado como antes, o cartão sozinho
          ocupava a tela toda e empurrava a análise para fora da dobra. */}
      <div className="p-5 text-left md:p-6">
        <div className="flex items-start gap-4 md:gap-7">
        <div className="relative shrink-0">
          {onVerStories ? (
            <button
              type="button"
              onClick={onVerStories}
              title="Ver stories"
              className="block rounded-full bg-gradient-to-tr from-yellow via-pink to-purple p-[3px] transition hover:opacity-90"
            >
              <span className="block rounded-full bg-card p-1">
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.displayName ?? profile.username}
                  size={72}
                  className="md:hidden"
                />
                <Avatar
                  src={profile.avatarUrl}
                  name={profile.displayName ?? profile.username}
                  size={104}
                  className="hidden md:block"
                />
              </span>
              <span className="mt-1 block text-center text-[11px] font-bold text-accent">
                Ver stories
              </span>
            </button>
          ) : (
            <div className="rounded-full p-1 ring-[3px] ring-pink">
              <Avatar
                src={profile.avatarUrl}
                name={profile.displayName ?? profile.username}
                size={72}
                className="md:hidden"
              />
              <Avatar
                src={profile.avatarUrl}
                name={profile.displayName ?? profile.username}
                size={104}
                className="hidden md:block"
              />
            </div>
          )}
          {tracking?.saved && (
            <span
              className="absolute -right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-pink shadow"
              title="No seu Faro"
            >
              <PawPrint className="h-4 w-4 fill-ink text-ink" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              {profile.username}
            </h1>
            {profile.isVerified && <BadgeCheck className="h-5 w-5 shrink-0 text-[#3897F0]" />}
            {(() => {
              const t = tier ?? (premium ? "pro" : "free");
              if (t === "pro") return <StatusPill tone="yellow">PRO</StatusPill>;
              if (t === "single") return <StatusPill tone="dark">DESBLOQUEADO</StatusPill>;
              return <StatusPill tone="pink">GRÁTIS</StatusPill>;
            })()}
          </div>

            {profile.displayName && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.displayName}</p>
            )}
          </div>
        </div>

        {/* Daqui para baixo, largura cheia. */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-4 md:justify-start md:gap-8">
            {typeof profile.postsCount === "number" && profile.postsCount > 0 && (
              <Stat value={formatNumber(profile.postsCount)} label="publicações" />
            )}
            <Stat value={formatNumber(profile.followersCount)} label="seguidores" />
            <Stat value={formatNumber(profile.followingCount)} label="seguindo" />
          </div>

          {/* O link é a pista mais honesta que existe: foi a própria pessoa que
              escolheu publicá-lo. Mostramos o domínio, não a URL inteira. */}
          {profile.externalUrl && (
            <a
              href={profile.externalUrl}
              target="_blank"
              rel="noreferrer nofollow"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs font-semibold text-vinho transition hover:border-accent/40"
              title={profile.externalUrl}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {domainOf(profile.externalUrl)}
            </a>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                profile.isPrivate
                  ? "border-amber-500/50 bg-amber-100 text-amber-800"
                  : "border-emerald-500/50 bg-emerald-100 text-emerald-800"
              }`}
            >
              {profile.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              {profile.isPrivate ? "Perfil privado" : "Perfil público"}
            </span>
          </div>
          {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}

          {onTrack && (
            <button
              type="button"
              onClick={onTrack}
              disabled={tracking?.busy || tracking?.saved}
              className={`mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition md:w-auto ${
                tracking?.saved
                  ? "bg-muted text-foreground"
                  : "bg-pink text-ink hover:opacity-90"
              }`}
            >
              {tracking?.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <PawPrint className={`h-4 w-4 ${tracking?.saved ? "fill-pink text-accent" : ""}`} />
              )}
              {tracking?.saved ? "No seu Faro" : "Colocar no Faro"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
