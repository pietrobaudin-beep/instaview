"use client";

import * as React from "react";
import {
  AtSign,
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
import { cn } from "@/lib/utils";
import type { Section, SectionData, Ranked } from "@/lib/raio-x";
import type { FollowerEntry, PostItem, StoryItem } from "@/lib/providers/types";

type Result =
  | { kind: "loading" }
  | { kind: "ok"; data: SectionData; locked: boolean; fetchedAt: string }
  | { kind: "private" }
  | { kind: "unsupported" }
  | { kind: "limited" }
  | { kind: "error" };

// Switching tabs back and forth never refetches within the visit.
const memo = new Map<string, Result>();

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
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const postLink = (p: PostItem) =>
  p.code ? `https://www.instagram.com/${p.kind === "reel" ? "reel" : "p"}/${p.code}/` : null;

const KIND_ICON = { photo: ImageIcon, video: Play, carousel: Layers, reel: Clapperboard } as const;

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
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 to-transparent px-2.5 pb-2 pt-6 text-[11px] font-semibold text-cream">
        {showOwner && post.owner && <p className="truncate">@{post.owner.username}</p>}
        <div className="flex items-center gap-2.5">
          {post.likeCount != null && (
            <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{compact(post.likeCount)}</span>
          )}
          {post.commentCount != null && (
            <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{compact(post.commentCount)}</span>
          )}
          {post.viewCount != null && (
            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{compact(post.viewCount)}</span>
          )}
          <span className="ml-auto font-medium opacity-80">{ago(post.takenAt)}</span>
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
    <div className={cn("grid gap-2.5", reels ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3 lg:grid-cols-4")}>
      {posts.map((p) => (
        <Tile key={p.id} post={p} locked={locked} showOwner={showOwner} />
      ))}
    </div>
  );
}

function People({ title, note, items, locked }: { title: string; note: string; items: Ranked[]; locked: boolean }) {
  if (!items.length) return null;
  return (
    <Panel title={title}>
      <p className="-mt-1 mb-2 text-[11px] text-muted-foreground">{note}</p>
      <ul className="divide-y divide-border">
        {items.map((r) => (
          <li key={r.user.username + r.count}>
            <PersonRow
              username={r.user.username}
              displayName={r.user.displayName}
              avatarUrl={r.user.avatarUrl}
              blurred={locked}
              size={36}
              right={<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold">{r.count}×</span>}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Stories({ items, locked }: { items: StoryItem[]; locked: boolean }) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Mascot pose="dormindo" className="h-16 text-ink" bob decorative />
        <p className="text-sm text-muted-foreground">Nenhum story nas últimas 24h.</p>
      </div>
    );
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {items.map((s) => (
        <div key={s.id} className="w-32 shrink-0">
          <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-gradient-to-br from-pink/50 to-yellow/50 ring-2 ring-pink ring-offset-2 ring-offset-background">
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
          </div>
          {s.mentions.length > 0 && (
            <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
              <AtSign className="mr-0.5 inline h-3 w-3" />
              {s.mentions.map((m) => m.username).join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function Users({ users, locked }: { users: FollowerEntry[]; locked: boolean }) {
  if (!users.length) return <Empty />;
  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <li key={u.username + (u.avatarUrl ?? "")}>
          <PersonRow username={u.username} displayName={u.displayName} avatarUrl={u.avatarUrl} blurred={locked} size={36} />
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
  tagged: "Posts de outras pessoas em que este perfil foi marcado — e quem mais marca.",
  highlights: "Os destaques salvos no perfil.",
  reposts: "O que este perfil repostou de outras contas.",
  suggested: "Contas que o próprio Instagram sugere como parecidas com esta.",
  about: "O que o Instagram informa sobre a conta.",
};

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
        body = <Stories items={data.items} locked={locked} />;
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
        body = (
          <div className="space-y-5">
            <Grid posts={data.items} locked={locked} showOwner />
            <People title="Quem mais marca este perfil" note="Donos dos posts em que ele aparece." items={data.people} locked={locked} />
          </div>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Fact icon={Calendar} label="Conta criada em" value={a.joined ?? "não informado"} />
            <Fact icon={Globe} label="País da conta" value={a.country ?? "não informado"} />
            <Fact
              icon={UserRound}
              label="Trocas de @"
              value={a.formerUsernames == null ? "não informado" : a.formerUsernames === 0 ? "nunca trocou" : `${a.formerUsernames}×`}
            />
          </div>
        );
        break;
      }
    }
  }

  const locked = res.kind === "ok" && res.locked;
  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{INTRO[section]}</p>
          {locked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-yellow px-2.5 py-1 text-[11px] font-bold text-ink">
              <Lock className="h-3 w-3" /> prévia
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
