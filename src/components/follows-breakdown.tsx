"use client";

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
export function FollowsBreakdown({
  counts,
  locked,
  username,
}: {
  counts?: Breakdown;
  locked: boolean;
  username: string;
}) {
  // Only real people count here — brands/verified accounts are left out of the
  // product entirely, so the two bars are relative to each other.
  const people = (counts?.girls ?? 0) + (counts?.boys ?? 0);
  if (!counts || people === 0) return null;
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
      <div className="space-y-3">
        <BarRow label="Mulheres" percent={share(counts.girls)} value={counts.girls} tone="pink" />
        <BarRow label="Homens" percent={share(counts.boys)} value={counts.boys} tone="blue" />
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Classificação automática pelo nome — pode conter erros. Baseado nas {people} pessoas mais
        recentes que essa pessoa começou a seguir.
      </p>
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
      <p className="mt-3 text-[11px] text-muted-foreground">
        Entre os sinais disponíveis, este perfil aparece com frequência.
      </p>
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
