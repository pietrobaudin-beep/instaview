"use client";

import { FakeAvatar, PEOPLE } from "@/components/landing/people";
import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BarRow, Panel, PersonRow } from "@/components/ui/brand";

export interface Breakdown {
  girls: number;
  boys: number;
  brands: number;
  total: number;
  percent: { girls: number; boys: number; brands: number };
}

export interface Person {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  gender?: "f" | "m" | "u";
  count?: number;
}

/** "Quem ela segue?" — the mulheres / homens / marcas split. */
// O CDN do Instagram bloqueia imagem embutida; passa pelo proxy.
const viaProxy = (u: string) =>
  /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(u) ? `/api/img?url=${encodeURIComponent(u)}` : u;

/**
 * "24 garotas" — o cartão rosa da prévia grátis: o número grande, um ícone e
 * as fotinhas empilhadas com "+N". Mostra só o gênero oposto ao do dono do
 * perfil (estimado pelo nome); sem estimativa, a tela mostra os dois.
 */
function CartaoGenero({
  genero,
  quantos,
  rostos,
}: {
  genero: "f" | "m";
  quantos: number;
  rostos: string[];
}) {
  const extra = Math.max(0, quantos - rostos.length);
  return (
    <div className="flex min-h-[100px] items-center gap-4 rounded-3xl bg-pink p-4 shadow-sm">
      {/* O mesmo desenho das pessoas da página inicial, no lugar de emoji. */}
      <span className="shrink-0 rounded-full bg-white p-1 ring-2 ring-white">
        <FakeAvatar person={genero === "f" ? PEOPLE.julia : PEOPLE.lucas} size={52} />
      </span>
      <p className="min-w-0 flex-1 leading-none">
        <span className="block text-3xl font-extrabold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.15)]">
          {quantos}
        </span>
        <span className="mt-1 block text-lg font-bold text-white/90">
          {genero === "f" ? (quantos === 1 ? "garota" : "garotas") : quantos === 1 ? "garoto" : "garotos"}
        </span>
      </p>
      {quantos > 0 && (
        <div className="flex shrink-0 items-center -space-x-3">
          {rostos.map((r, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={viaProxy(r)}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white blur-[2px]"
            />
          ))}
          {extra > 0 && (
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-white ring-2 ring-white">
              +{extra}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function FollowsBreakdown({
  counts,
  locked,
  username,
  generoDoPerfil,
  rostos,
}: {
  /** Fotos de amostra por gênero, para o cartão da prévia grátis. */
  rostos?: { f: string[]; m: string[] } | null;
  counts?: Breakdown;
  locked: boolean;
  username: string;
  /**
   * Na prévia grátis, o gênero estimado do dono do perfil: o outro gênero
   * ganha destaque ("👀 Homens que ela segue"). Estimativa pelo nome.
   */
  generoDoPerfil?: "f" | "m" | "u";
}) {
  // Only real people count here — brands/verified accounts are left out of the
  // product entirely, so the two bars are relative to each other.
  const people = (counts?.girls ?? 0) + (counts?.boys ?? 0);
  if (!counts || people === 0) return null;

  // Prévia grátis: o cartão rosa, só com o gênero oposto ao do perfil.
  if (locked) {
    const mostrar: ("f" | "m")[] =
      generoDoPerfil === "m" ? ["f"] : generoDoPerfil === "f" ? ["m"] : ["f", "m"];
    return (
      <section className="space-y-3">
        <p className="text-sm font-bold">O que @{username} seguiu recentemente</p>
        {mostrar.map((g) => (
          <CartaoGenero
            key={g}
            genero={g}
            quantos={g === "f" ? counts.girls : counts.boys}
            rostos={rostos?.[g] ?? []}
          />
        ))}
        <p className="text-[11px] text-muted-foreground">
          Entre as {counts.total} contas mais recentes que @{username} segue · estimativa pelo nome.
        </p>
      </section>
    );
  }
  const share = (n: number) => Math.round((n / people) * 100);
  return (
    <Panel
      title="Quem essa pessoa segue"
      action={
        locked ? (
          <Link
            href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
            className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Plano gratuito
          </Link>
        ) : null
      }
    >
      {locked && (
        <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
          Entre as {counts.total} contas mais recentes que @{username} segue.
        </p>
      )}
      <div className="space-y-3">
        {locked && generoDoPerfil === "f" ? (
          <>
            <div className="rounded-2xl bg-blue-50 p-2.5 ring-1 ring-blue-200">
              <p className="mb-1.5 text-xs font-bold text-blue-900">👀 Os homens que ela segue</p>
              <BarRow label="Homens" percent={share(counts.boys)} value={counts.boys} tone="blue" />
            </div>
            <BarRow label="Mulheres" percent={share(counts.girls)} value={counts.girls} tone="pink" />
          </>
        ) : locked && generoDoPerfil === "m" ? (
          <>
            <div className="rounded-2xl bg-pink/20 p-2.5 ring-1 ring-pink">
              <p className="mb-1.5 text-xs font-bold text-accent">👀 As mulheres que ele segue</p>
              <BarRow label="Mulheres" percent={share(counts.girls)} value={counts.girls} tone="pink" />
            </div>
            <BarRow label="Homens" percent={share(counts.boys)} value={counts.boys} tone="blue" />
          </>
        ) : (
          <>
            <BarRow label="Mulheres" percent={share(counts.girls)} value={counts.girls} tone="pink" />
            <BarRow label="Homens" percent={share(counts.boys)} value={counts.boys} tone="blue" />
          </>
        )}
      </div>
    </Panel>
  );
}

/** "Conta que mais interage" — the single top account, highlighted. */
export function TopInteraction({
  person,
  locked,
  username,
}: {
  person?: Person;
  locked: boolean;
  username: string;
}) {
  if (!person) return null;
  return (
    <Panel
      title="👀 Parece ter mais interação com"
      action={
        !locked ? null : (
          <Link
            href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-accent"
          >
            Ver mais <ArrowRight className="h-3 w-3" />
          </Link>
        )
      }
    >
      <PersonRow
        username={person.username}
        displayName={person.displayName}
        avatarUrl={person.avatarUrl}
        size={48}
        blurred={locked}
        className="py-0"
      />
    </Panel>
  );
}

/** "Outras contas que ela interage bastante" — the free teaser row. */
export function OtherInteractions({
  people,
  locked,
  username,
}: {
  people: Person[];
  locked: boolean;
  username: string;
}) {
  // Três de cara; o resto abre no "Ver mais". Seis fotos de uma vez empurravam
  // o próximo bloco para fora da tela no celular.
  const [tudo, setTudo] = React.useState(false);
  const PREVIA = 3;
  /** O teto desta lista, aberta: dez pessoas, como nas outras da tela. */
  const MAXIMO = 10;
  const visiveis = people.slice(0, tudo ? MAXIMO : PREVIA);

  if (people.length === 0) return null;
  return (
    <Panel title="Pessoas que aparecem bastante">
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {visiveis.map((p, i) => (
          <li key={p.username + i} className="text-center">
            <div className={locked ? "blur-[5px]" : ""}>
              <div className="mx-auto h-[72px] w-[72px] overflow-hidden rounded-2xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    p.avatarUrl && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(p.avatarUrl)
                      ? `/api/img?url=${encodeURIComponent(p.avatarUrl)}`
                      : p.avatarUrl || ""
                  }
                  alt={p.displayName ?? p.username}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
            </div>
            {locked ? (
              <div className="mx-auto mt-2 space-y-1" aria-hidden>
                <div className="mx-auto h-2.5 w-14 rounded bg-muted" />
                <div className="mx-auto h-2 w-10 rounded bg-muted/70" />
              </div>
            ) : (
              <>
                <p className="mt-2 truncate text-[11px] font-semibold">{p.username}</p>
                {p.displayName && (
                  <p className="truncate text-[10px] text-muted-foreground">{p.displayName}</p>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {!locked && people.length > PREVIA && (
        <button
          type="button"
          onClick={() => setTudo((t) => !t)}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-2xl border border-border text-sm font-bold text-accent transition hover:bg-muted/40"
        >
          {tudo ? "Ver menos" : `Ver mais ${Math.min(people.length, MAXIMO) - PREVIA}`}
        </button>
      )}

      {locked && (
        <p className="mt-5 text-center text-sm font-semibold">
          Veja muito mais com o{" "}
          <Link
            href={`/pricing?next=${encodeURIComponent(`/p/${username}`)}`}
            className="text-accent underline underline-offset-2"
          >
            Farejo Pro
          </Link>
          .
        </p>
      )}
    </Panel>
  );
}
