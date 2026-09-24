import Link from "next/link";
import { ArrowUpRight, ChevronDown, PawPrint } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TirarDoFaro } from "@/components/tirar-do-faro";
import { activityLevel, pistas } from "@/lib/voice";

export interface PessoaResumo {
  username: string;
  avatarUrl: string | null;
}

export interface MidiaResumo {
  id: string;
  thumbnailUrl: string | null;
}

export interface PerfilResumo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  pistasSemana: number;
  seguiu: { total: number; pessoas: PessoaResumo[] };
  deixou: { total: number; pessoas: PessoaResumo[] };
  stories: { total: number; itens: MidiaResumo[] };
  marcacoes: { total: number; itens: MidiaResumo[] };
}

// O CDN do Instagram bloqueia imagem embutida em outro site; passa pelo proxy.
const proxied = (url: string | null) =>
  url && /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(url)
    ? `/api/img?url=${encodeURIComponent(url)}`
    : url;

function Rotulo({ titulo, total, sufixo }: { titulo: string; total: number; sufixo: string }) {
  return (
    <p className="mb-2 flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-plum/50">
      {titulo}
      <span className="normal-case tracking-normal text-muted-foreground">
        {total} {sufixo}
      </span>
    </p>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}

function Pessoas({ pessoas }: { pessoas: PessoaResumo[] }) {
  return (
    <ul className="sem-barra -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
      {pessoas.map((p) => (
        <li key={p.username} className="w-16 shrink-0 text-center">
          <Avatar src={p.avatarUrl} name={p.username} size={56} className="mx-auto" />
          <p className="mt-1 truncate text-[11px] font-semibold">@{p.username}</p>
        </li>
      ))}
    </ul>
  );
}

function Midias({ itens, href, formato }: { itens: MidiaResumo[]; href: string; formato: "story" | "post" }) {
  return (
    <ul className="sem-barra -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {itens.map((m) => {
        const src = proxied(m.thumbnailUrl);
        return (
          <li key={m.id} className="shrink-0">
            <Link
              href={href}
              className={`block overflow-hidden rounded-xl bg-muted ${
                formato === "story" ? "h-28 w-16" : "h-20 w-20"
              }`}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * O resumo de um perfil do Faro AI, com o conteúdo à vista.
 *
 * Antes cada perfil era um cartão com um número ("25 pistas esta semana") e
 * era preciso entrar para ver quem eram. Aqui aparece o que o Faro AI guardou:
 * as pessoas, os stories e as marcações. Tudo vem do banco — abrir esta tela
 * não faz nenhuma leitura paga.
 */
export function ResumoDoFaro({ perfil }: { perfil: PerfilResumo }) {
  const painel = `/rastros/${encodeURIComponent(perfil.username)}`;
  const level = activityLevel(perfil.pistasSemana);

  return (
    <section className="relative min-w-0 rounded-3xl border border-border bg-card">
      <TirarDoFaro profileId={perfil.id} username={perfil.username} />
      <Link
        href={painel}
        className="flex items-center gap-4 rounded-t-3xl p-5 pr-12 transition hover:bg-muted/40"
      >
        <div className="relative shrink-0">
          <div className="rounded-full p-0.5 ring-2 ring-pink">
            <Avatar src={perfil.avatarUrl} name={perfil.displayName ?? perfil.username} size={52} />
          </div>
          <PawPrint className="absolute -right-1 -top-1 h-5 w-5 fill-pink text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">@{perfil.username}</p>
          <p className="text-xs text-muted-foreground">
            {level.emoji} {level.label} · {pistas(perfil.pistasSemana)} esta semana
          </p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-vinho sm:flex">
          Abrir painel <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>

      {/* A prévia fica fechada: a lista de perfis continua curta de ler, e o
          conteúdo abre só para quem pedir. `<details>` dispensa JavaScript. */}
      <details className="group border-t border-border">
        <summary className="mx-5 my-4 flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-1 rounded-2xl bg-muted text-sm font-semibold transition hover:bg-pink [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Exibir prévia</span>
          <span className="hidden group-open:inline">Esconder prévia</span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
      <div className="space-y-5 px-5 pb-5">
        <div>
          <Rotulo titulo="Começou a seguir" total={perfil.seguiu.total} sufixo="nos últimos 7 dias" />
          {perfil.seguiu.pessoas.length ? (
            <Pessoas pessoas={perfil.seguiu.pessoas} />
          ) : (
            <Vazio>Ninguém novo esta semana.</Vazio>
          )}
        </div>

        <div>
          <Rotulo titulo="Deixou de seguir" total={perfil.deixou.total} sufixo="nos últimos 7 dias" />
          {perfil.deixou.pessoas.length ? (
            <Pessoas pessoas={perfil.deixou.pessoas} />
          ) : (
            <Vazio>Ninguém saiu da lista esta semana.</Vazio>
          )}
        </div>

        <div>
          <Rotulo titulo="Stories guardados" total={perfil.stories.total} sufixo="no acervo" />
          {perfil.stories.itens.length ? (
            <Midias itens={perfil.stories.itens} href={painel} formato="story" />
          ) : (
            <Vazio>Nenhum story guardado ainda.</Vazio>
          )}
        </div>

        <div>
          <Rotulo titulo="Marcações" total={perfil.marcacoes.total} sufixo="encontradas" />
          {perfil.marcacoes.itens.length ? (
            <Midias itens={perfil.marcacoes.itens} href={painel} formato="post" />
          ) : (
            <Vazio>Nenhuma marcação encontrada ainda.</Vazio>
          )}
        </div>

        <Link
          href={painel}
          className="flex min-h-[44px] items-center justify-center gap-1 rounded-2xl bg-muted text-sm font-semibold transition hover:bg-pink"
        >
          Abrir o painel completo <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      </details>
    </section>
  );
}
