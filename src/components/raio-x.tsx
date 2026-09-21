"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Calendar,
  Clapperboard,
  Eye,
  Globe,
  Heart,
  ImageIcon,
  Layers,
  Loader2,
  Lock,
  MessageCircle,
  Pin,
  Play,
  RefreshCw,
  Repeat2,
  UserRound,
} from "lucide-react";
import { Panel, PersonRow } from "@/components/ui/brand";
import { Mascot } from "@/components/ui/mascot";
import { StoryViewer } from "@/components/story-viewer";
import { cn } from "@/lib/utils";
import type { Section, SectionData, Ranked } from "@/lib/raio-x";
import type { FollowerEntry, PostItem, StoryItem } from "@/lib/providers/types";

type Result =
  | { kind: "loading" }
  | { kind: "ok"; data: SectionData; locked: boolean; fetchedAt: string }
  | { kind: "locked" }
  | { kind: "private" }
  | { kind: "unsupported" }
  | { kind: "limited" }
  | { kind: "error" };

// Switching tabs back and forth never refetches within the visit.
const memo = new Map<string, Result>();
/** Pedidos em voo, para dois lugares da tela não pagarem a mesma seção duas vezes. */
const emVoo = new Map<string, Promise<Result>>();

const proxied = (url: string | null) =>
  url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url) ? `/api/img?url=${encodeURIComponent(url)}` : url;

const compact = (n: number | null) =>
  n == null ? null : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".0", "")} mi` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".0", "")} mil` : String(n);

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  if (s < 30 * 86400) return `há ${Math.round(s / 86400)} d`;
  // Curto de propósito: "21 jul 26" cabe numa linha da miniatura; a data por
  // extenso quebrava em quatro linhas e cobria a foto.
  return new Date(iso)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })
    .replace(/\.?\s?de\s?/g, " ")
    .replace(/\./g, "")
    .trim();
}

const postLink = (p: PostItem) =>
  p.code ? `https://www.instagram.com/${p.kind === "reel" ? "reel" : "p"}/${p.code}/` : null;

const KIND_ICON = { photo: ImageIcon, video: Play, carousel: Layers, reel: Clapperboard } as const;

const LOCKED_TEXT: Partial<Record<Section, string>> = {
  stories: "Os stories das últimas 24h",
  posts: "As publicações recentes",
  reels: "Os reels recentes",
};

/**
 * O que quem é grátis vê nas seções pagas.
 *
 * Os quadros são enfeite, não conteúdo: nenhum dado real é pedido ao provedor
 * aqui, e nada finge ser uma publicação de verdade. É um cadeado honesto.
 */
function LockedSection({ section, username }: { section: Section; username: string }) {
  const vertical = section !== "posts";
  return (
    <div className="relative">
      <div
        aria-hidden
        className={cn("grid gap-2.5 blur-[2px]", vertical ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}
      >
        {Array.from({ length: vertical ? 4 : 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl bg-gradient-to-br from-blush to-mint/70",
              vertical ? "aspect-[9/16]" : "aspect-square",
            )}
          />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-plum text-white shadow-lg">
          <Lock className="h-5 w-5" />
        </span>
        <p className="max-w-[16rem] text-sm font-semibold text-plum">
          {LOCKED_TEXT[section] ?? "Esta parte"} de @{username} abrem com o desbloqueio.
        </p>
      </div>
    </div>
  );
}

/** A post/reel tile: image (blurred when locked), kind, date and numbers. */
function Tile({ post, locked, showOwner }: { post: PostItem; locked: boolean; showOwner?: boolean }) {
  const [broken, setBroken] = React.useState(false);
  const Icon = KIND_ICON[post.kind];
  const img = proxied(post.thumbnailUrl);
  const href = locked ? null : postLink(post);
  const body = (
    <div className={cn("group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink/40 to-purple/40", post.kind === "reel" ? "aspect-[9/16]" : "aspect-square")}>
      {img && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className={cn("h-full w-full object-cover transition group-hover:scale-[1.03]", locked && "scale-110 blur-md")}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon className="h-7 w-7 text-vinho/40" />
        </div>
      )}
      <span className="absolute right-2 top-2 rounded-full bg-ink/60 p-1 text-cream">
        <Icon className="h-3 w-3" />
      </span>
      {/* A data fica aqui em cima: embaixo ela disputava espaço com os números
          e acabava cortada nas miniaturas do celular. */}
      {post.takenAt && (
        <span className="absolute left-2 top-2 rounded-full bg-ink/60 px-1.5 py-0.5 text-[10px] font-bold text-cream">
          {ago(post.takenAt)}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-2.5 pb-2.5 pt-8 text-xs font-semibold text-cream">
        {showOwner && post.owner && <p className="truncate">@{post.owner.username}</p>}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          {post.likeCount != null && (
            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{compact(post.likeCount)}</span>
          )}
          {post.commentCount != null && (
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{compact(post.commentCount)}</span>
          )}
          {post.viewCount != null && (
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{compact(post.viewCount)}</span>
          )}
        </div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title="Abrir no Instagram">
      {body}
    </a>
  ) : (
    body
  );
}

function Grid({ posts, locked, showOwner, reels }: { posts: PostItem[]; locked: boolean; showOwner?: boolean; reels?: boolean }) {
  if (!posts.length) return <Empty />;
  return (
    // Duas colunas no celular: com três, cada miniatura ficava com ~90px e nem
    // a imagem nem os números davam para ver.
    <div
      className={cn(
        "grid gap-2.5",
        reels ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
      )}
    >
      {posts.map((p) => (
        <Tile key={p.id} post={p} locked={locked} showOwner={showOwner} />
      ))}
    </div>
  );
}

/** Quantos nomes o ranking mostra antes do "Ver mais". */
const RANKING = 4;

function People({ title, note, items, locked }: { title: string; note: string; items: Ranked[]; locked: boolean }) {
  // Listas de 20 nomes viravam uma parede; quatro dão a ideia e o resto abre.
  const [tudo, setTudo] = React.useState(false);
  const visiveis = tudo ? items : items.slice(0, RANKING);

  if (!items.length) return null;
  return (
    <Panel title={title}>
      <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">{note}</p>
      <ul className="divide-y divide-border">
        {visiveis.map((r) => (
          <li key={r.user.username + r.count}>
            <PersonRow
              username={r.user.username}
              displayName={r.user.displayName}
              avatarUrl={r.user.avatarUrl}
              blurred={locked}
              href={`/p/${encodeURIComponent(r.user.username)}`}
              size={36}
              right={<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{r.count}×</span>}
            />
          </li>
        ))}
      </ul>
      {items.length > RANKING && (
        <button
          type="button"
          onClick={() => setTudo((t) => !t)}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-border text-sm font-bold text-accent transition hover:bg-muted/40"
        >
          {tudo ? "Ver menos" : `Ver mais ${items.length - RANKING}`}
        </button>
      )}
    </Panel>
  );
}

function Stories({ items, locked, username }: { items: StoryItem[]; locked: boolean; username: string }) {
  // Qual story está aberto em tela cheia. -1 = nenhum.
  const [aberto, setAberto] = React.useState(-1);
  if (!items.length)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Mascot pose="dormindo" className="h-16 text-ink" bob decorative />
        <p className="text-sm text-muted-foreground">Nenhum story nas últimas 24h.</p>
      </div>
    );
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {items.map((s, i) => (
        <div key={s.id} className="w-40 shrink-0 sm:w-32">
          <button
            type="button"
            onClick={() => !locked && setAberto(i)}
            aria-label={`Ver story de @${username}`}
            disabled={locked}
            className="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-pink/50 to-yellow/50 ring-2 ring-pink ring-offset-2 ring-offset-background transition hover:opacity-90 disabled:cursor-not-allowed"
          >
            {s.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proxied(s.thumbnailUrl)!} alt="" className={cn("h-full w-full object-cover", locked && "scale-110 blur-md")} />
            ) : (
              <div className="flex h-full items-center justify-center">
                {s.kind === "video" ? <Play className="h-6 w-6 text-vinho/40" /> : <ImageIcon className="h-6 w-6 text-vinho/40" />}
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-ink/60 px-1.5 py-0.5 text-[10px] font-bold text-cream">
              {ago(s.takenAt)}
            </span>
          </button>
          {s.mentions.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {s.mentions.map((m) => (
                <Link
                  key={m.username}
                  href={`/p/${encodeURIComponent(m.username)}`}
                  title={`Farejar @${m.username}`}
                  className="flex items-center gap-1 truncate text-[11px] font-semibold text-accent hover:underline"
                >
                  <Search className="h-3 w-3 shrink-0" />
                  <span className="truncate">Farejar @{m.username}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      {aberto >= 0 && (
        <StoryViewer
          username={username}
          stories={items.map((s) => ({
            id: s.id,
            imageUrl: proxied(s.thumbnailUrl),
            takenAt: s.takenAt,
            kind: s.kind,
            mentions: s.mentions.map((m) => m.username),
          }))}
          startAt={aberto}
          onClose={() => setAberto(-1)}
        />
      )}
    </div>
  );
}

function Users({ users, locked }: { users: FollowerEntry[]; locked: boolean }) {
  if (!users.length) return <Empty />;
  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <li key={u.username + (u.avatarUrl ?? "")}>
          <PersonRow
            username={u.username}
            displayName={u.displayName}
            avatarUrl={u.avatarUrl}
            blurred={locked}
            href={`/p/${encodeURIComponent(u.username)}`}
            size={36}
          />
        </li>
      ))}
    </ul>
  );
}

function Empty({ text = "Nada por aqui nesta leitura." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink/50">
        <Icon className="h-4 w-4 text-vinho" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold">{value}</p>
      </div>
    </div>
  );
}

const INTRO: Record<Section, string> = {
  stories: "Os stories publicados nas últimas 24 horas, e quem foi marcado neles.",
  posts: "As publicações mais recentes, as fixadas no topo e quem mais aparece marcado.",
  reels: "Os reels mais recentes, com visualizações.",
  tagged: "Quem marcou esta pessoa em publicações recentes.",
  highlights: "Os destaques salvos no perfil.",
  reposts: "O que este perfil repostou de outras contas.",
  suggested: "Contas que o próprio Instagram sugere como parecidas com esta.",
  about: "O que o Instagram informa sobre a conta.",
};

/**
 * O "Sobre" em letra miúda, no rodapé de qualquer seção.
 *
 * Deixou de ser aba: país, trocas de @ e data de criação são contexto, não
 * destino. Custa **uma** requisição por perfil (guardada 7 dias e dividida
 * entre todo mundo), pedida uma única vez por visita, não uma por aba — a
 * resposta fica no mesmo `memo` que as seções usam.
 */
export function AboutLine({ username }: { username: string }) {
  const key = `${username}:about`;
  const [res, setRes] = React.useState<Result>(() => memo.get(key) ?? { kind: "loading" });

  React.useEffect(() => {
    if (memo.get(key)) return setRes(memo.get(key)!);
    let vivo = true;
    const pedido =
      emVoo.get(key) ??
      fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=about`)
        .then(async (r) => {
          const b = await r.json().catch(() => ({}));
          const out: Result =
            b.status === "ok"
              ? { kind: "ok", data: b.data, locked: !!b.locked, fetchedAt: b.fetchedAt }
              : { kind: "unsupported" };
          memo.set(key, out);
          return out;
        })
        .catch((): Result => ({ kind: "unsupported" }))
        .finally(() => emVoo.delete(key));
    emVoo.set(key, pedido);
    pedido.then((out) => vivo && setRes(out));
    return () => {
      vivo = false;
    };
  }, [key, username]);

  if (res.kind !== "ok" || res.data.section !== "about") return null;
  const a = res.data.about;

  const partes = [
    a.country ? `País da conta: ${a.country}` : null,
    a.formerUsernames == null
      ? null
      : a.formerUsernames === 0
        ? "nunca trocou de @"
        : `trocou de @ ${a.formerUsernames}×`,
    a.joined ? `conta criada em ${a.joined}` : null,
  ].filter(Boolean);
  if (!partes.length) return null;

  return (
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
      {partes.join(" · ")}. <span className="opacity-70">O que o Instagram informa sobre a conta.</span>
    </p>
  );
}

/**
 * One Raio-X section of a profile, fetched when its tab opens. Free visitors
 * see the preview (blurred images, masked names); `upgrade` is shown below it.
 */
export function RaioX({ username, section, upgrade }: { username: string; section: Section; upgrade?: React.ReactNode }) {
  const key = `${username}:${section}`;
  const [res, setRes] = React.useState<Result>(() => memo.get(key) ?? { kind: "loading" });
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    const hit = memo.get(key);
    if (hit && nonce === 0) {
      setRes(hit);
      return;
    }
    let alive = true;
    setRes({ kind: "loading" });
    fetch(`/api/raio-x?username=${encodeURIComponent(username)}&section=${section}`)
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        const out: Result =
          r.status === 402
            ? { kind: "limited" }
            : b.status === "locked"
            ? { kind: "locked" }
            : b.status === "ok"
              ? { kind: "ok", data: b.data, locked: !!b.locked, fetchedAt: b.fetchedAt }
              : b.status === "private"
                ? { kind: "private" }
                : b.status === "unsupported"
                  ? { kind: "unsupported" }
                  : { kind: "error" };
        if (out.kind !== "error") memo.set(key, out);
        if (alive) setRes(out);
      })
      .catch(() => alive && setRes({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [key, username, section, nonce]);

  let body: React.ReactNode;
  if (res.kind === "loading") {
    body = (
      <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
        <Mascot pose="lupa" className="h-14 text-ink" bob decorative />
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Farejando…
        </span>
      </div>
    );
  } else if (res.kind === "private") {
    body = <Empty text={`@${username} é uma conta privada — essa parte só aparece para seguidores aprovados.`} />;
  } else if (res.kind === "unsupported") {
    body = <Empty text="Essa informação ainda não está disponível." />;
  } else if (res.kind === "locked") {
    body = <LockedSection section={section} username={username} />;
  } else if (res.kind === "limited") {
    body = <Empty text="Sua análise gratuita já foi usada em outro perfil." />;
  } else if (res.kind === "error") {
    body = (
      <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
        O Faro não conseguiu farejar agora.
        <button type="button" onClick={() => setNonce((n) => n + 1)} className="inline-flex items-center gap-1.5 font-semibold text-vinho hover:underline">
          <RefreshCw className="h-4 w-4" /> Tentar de novo
        </button>
      </div>
    );
  } else {
    const { data, locked } = res;
    switch (data.section) {
      case "stories":
        body = <Stories items={data.items} locked={locked} username={username} />;
        break;
      case "posts":
        body = (
          <div className="space-y-5">
            {data.pinned.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Pin className="h-3.5 w-3.5" /> Fixados no topo
                </p>
                <Grid posts={data.pinned} locked={locked} />
              </div>
            )}
            <Grid posts={data.items} locked={locked} />
            <People title="Quem mais aparece marcado" note="Contas marcadas nas publicações recentes." items={data.people} locked={locked} />
          </div>
        );
        break;
      case "reels":
        body = <Grid posts={data.items} locked={locked} reels />;
        break;
      case "tagged":
        // Só QUEM marcou, não a publicação: a foto do post de outra pessoa não
        // é o que se veio ver aqui — e é conteúdo de terceiro que o Farejo não
        // precisa exibir.
        body = (
          <People
            title="Quem marca este perfil"
            note="Contas que publicaram marcando esta pessoa."
            items={data.people}
            locked={locked}
          />
        );
        break;
      case "highlights":
        body = data.items.length ? (
          <div className="flex flex-wrap gap-5">
            {data.items.map((h) => (
              <div key={h.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <span className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-br from-pink/50 to-purple/40 ring-2 ring-border ring-offset-2 ring-offset-background">
                  {h.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxied(h.coverUrl)!} alt="" className={cn("h-full w-full object-cover", locked && "scale-110 blur-md")} />
                  )}
                </span>
                <span className="w-full truncate text-xs font-semibold">{h.title || "—"}</span>
                <span className="text-[10px] text-muted-foreground">{h.count} itens</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        );
        break;
      case "reposts":
        body = <Grid posts={data.items} locked={locked} showOwner />;
        break;
      case "suggested":
        body = <Users users={data.users} locked={locked} />;
        break;
      case "about": {
        const a = data.about;
        body = (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Fact icon={Globe} label="País da conta" value={a.country ?? "não informado"} />
              <Fact
                icon={UserRound}
                label="Trocas de @"
                value={a.formerUsernames == null ? "não informado" : a.formerUsernames === 0 ? "nunca trocou" : `${a.formerUsernames}×`}
              />
            </div>
            {/* A data de criação é nota de rodapé: interessa, mas não é o que
                a pessoa veio ver. */}
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" /> Conta criada em {a.joined ?? "data não informada"}.
            </p>
          </div>
        );
        break;
      }
    }
  }

  const locked = (res.kind === "ok" && res.locked) || res.kind === "locked";
  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{INTRO[section]}</p>
          {locked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow px-2.5 py-1 text-[11px] font-bold text-ink">
              <Lock className="h-3 w-3" /> {res.kind === "locked" ? "no PRO" : "prévia"}
            </span>
          )}
        </div>
        {body}
        {res.kind === "ok" && (
          <p className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Repeat2 className="h-3 w-3" /> Farejado {ago(res.fetchedAt)}
          </p>
        )}
      </Panel>
      {locked && upgrade}
    </div>
  );
}
