"use client";

import * as React from "react";
import { ArrowRight, BadgeCheck, Globe, Link as LinkIcon, Loader2, Lock, PawPrint, ThumbsDown, ThumbsUp } from "lucide-react";
import NextLink from "next/link";
import { Avatar } from "@/components/ui/avatar";
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
/** O que a busca das redes de graça devolve — ver `OtherNetworks.inicial`. */
export interface RedesIniciais {
  links?: {
    network: string;
    label: string;
    handle: string;
    url: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }[];
  escondidas?: string[];
  votos?: Record<string, "sim" | "nao">;
  /**
   * Presente quando quem buscou já pediu a etapa paga — com ou sem sucesso.
   * É por ele que este bloco sabe que não precisa pedir de novo.
   */
  pagas?: boolean;
}

/**
 * O mesmo @ em outra rede — só quando a conta existe de verdade.
 *
 * Quem verifica é o servidor (/api/elsewhere), e só entra na lista o que ele
 * confirma: Telegram, X e TikTok de graça, TikTok com foto e YouTube pelo
 * Apify. O VSCO é a exceção — está atrás do Cloudflare e não dá para
 * confirmar, então o endereço é montado com o @.
 *
 * Como nada disso prova **identidade** (o mesmo @ pode ser de outra pessoa),
 * cada linha tem um joinha. Ver {@link Joinha}.
 */
export function OtherNetworks({
  username,
  isPrivate,
  destaque = false,
  inicial = null,
}: {
  username: string;
  isPrivate?: boolean;
  /** No beco sem saída do perfil privado, o bloco vira a saída principal. */
  destaque?: boolean;
  /**
   * O resultado das redes de graça. Quem busca é a tela de perfil, em paralelo
   * com a análise — este bloco **nunca** pede essa etapa.
   *
   * Chega `null` enquanto a busca corre e preenchido quando ela volta, mesmo
   * que volte depois da cena de carregamento ter desistido de esperar.
   */
  inicial?: RedesIniciais | null;
}) {
  type Elsewhere = {
    network: string;
    label: string;
    handle: string;
    url: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  type Voto = "sim" | "nao";

  /*
   * O @ do VSCO aceita letras, números, ponto, hífen e sublinhado, de 2 a 30.
   * Fora disso o endereço nem seria válido, e oferecer o link seria pior do
   * que não oferecer nada.
   */
  const vscoPossivel = /^[\w.-]{2,30}$/.test(username);

  const [links, setLinks] = React.useState<Elsewhere[]>((inicial?.links as Elsewhere[]) ?? []);
  const [procurando, setProcurando] = React.useState(false);
  const [procurouPagas, setProcurouPagas] = React.useState(inicial?.pagas !== undefined);
  const [falhou, setFalhou] = React.useState(false);

  /** O que esta pessoa já respondeu, por rede. */
  const [votos, setVotos] = React.useState<Record<string, Voto>>(inicial?.votos ?? {});
  /** As que ela escondeu — some da tela na hora, sem esperar o servidor. */
  const [escondidas, setEscondidas] = React.useState<string[]>(inicial?.escondidas ?? []);
  /** A última escondida, para oferecer o desfazer. */
  const [ultima, setUltima] = React.useState<{ rede: string; label: string } | null>(null);

  /**
   * Busca em duas etapas, sozinha.
   *
   * As redes de graça vêm prontas em `inicial` — a tela de perfil as busca
   * enquanto a cena de carregamento roda, e a cena só termina quando elas
   * respondem. Aqui sobra a segunda etapa: as que passam pelo Apify — TikTok
   * e YouTube, que trazem a foto e entram depois. Quem está olhando vê a lista aparecer e
   * depois ganhar as fotos, em vez de encarar um botão e um vazio.
   *
   * O botão que havia aqui saiu porque exigia descobrir que ele existia. A
   * conta do gasto continua de pé: cada @ custa cerca de US$ 0,003 na
   * primeira vez e fica 7 dias no cache — a segunda pessoa que abrir o mesmo
   * perfil não paga.
   */
  /*
   * Quando as redes de graça chegam, elas entram aqui — inclusive se chegarem
   * atrasadas, depois de a cena de carregamento ter desistido de esperar.
   */
  React.useEffect(() => {
    if (!inicial) return;
    setLinks((inicial.links as Elsewhere[]) ?? []);
    setEscondidas(inicial.escondidas ?? []);
    setVotos(inicial.votos ?? {});
    if (inicial.pagas !== undefined) setProcurouPagas(true);
  }, [inicial]);

  /**
   * A segunda etapa: as redes que passam pelo Apify.
   *
   * TikTok e YouTube, que trazem a foto. Só roda depois que as de graça
   * chegaram — sem isso, as duas listas brigariam pelo mesmo estado e a paga,
   * mais lenta, sobrescreveria a outra com um resultado incompleto.
   *
   * Cada @ custa cerca de US$ 0,003 na primeira vez e fica 7 dias no cache: a
   * segunda pessoa que abrir o mesmo perfil não paga.
   */
  React.useEffect(() => {
    if (!inicial) return;
    // Quem buscou já pediu a etapa paga — pedir de novo seria pagar duas vezes
    // pelo mesmo @. É o caso normal hoje: a tela de perfil busca as duas
    // etapas de uma vez, e a cena de carregamento espera as duas.
    if (inicial.pagas !== undefined) return;
    let vivo = true;
    setProcurando(true);

    (async () => {
      try {
        const r = await fetch(`/api/elsewhere?username=${encodeURIComponent(username)}&pagas=1`);
        if (!r.ok) throw new Error(String(r.status));
        const b = await r.json();
        if (!vivo) return;
        setLinks(b.links ?? []);
        setEscondidas(b.escondidas ?? []);
        setVotos(b.votos ?? {});
        setProcurouPagas(true);
      } catch {
        if (vivo) setFalhou(true);
      } finally {
        if (vivo) setProcurando(false);
      }
    })();

    return () => {
      vivo = false;
    };
    // Só o @ reinicia a etapa paga; `inicial` mudando de null para pronto é o
    // gatilho, e relê-lo a cada mudança pediria duas vezes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, Boolean(inicial)]);

  /**
   * Registra o voto e some na hora com o que foi marcado como errado.
   *
   * A tela não espera a resposta do servidor: quem disse "não é essa pessoa"
   * já sabe o que quer, e ver a linha continuar ali por um segundo parece que
   * o clique não funcionou. Se o pedido falhar, o voto volta atrás.
   */
  async function votar(rede: string, label: string, voto: Voto) {
    const antes = votos[rede];
    setVotos((v) => ({ ...v, [rede]: voto }));
    if (voto === "nao") {
      setEscondidas((e) => (e.includes(rede) ? e : [...e, rede]));
      setUltima({ rede, label });
    } else {
      setEscondidas((e) => e.filter((r) => r !== rede));
      setUltima(null);
    }

    try {
      const r = await fetch("/api/elsewhere", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, rede, voto }),
      });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      setVotos((v) => ({ ...v, [rede]: antes as Voto }));
      if (voto === "nao") {
        setEscondidas((e) => e.filter((r) => r !== rede));
        setUltima(null);
      }
    }
  }

  const visiveis = links.filter((l) => !escondidas.includes(l.network));
  const mostrarVsco = vscoPossivel && !escondidas.includes("vsco");

  /*
   * No perfil público o bloco só aparece quando há o que mostrar: ali ele é um
   * acréscimo no fim da página, e um título sozinho em cima do vazio seria
   * ruído. No privado ele fica de pé mesmo vazio, porque é a única saída da
   * tela — sumir enquanto procura pareceria que nada está acontecendo.
   */
  if (!isPrivate && visiveis.length === 0 && !mostrarVsco) return null;

  return (
    <div className={destaque ? "mt-6 w-full text-left" : "mt-4"}>
      {destaque && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-plum/50">
          Outras redes sociais
        </p>
      )}
      <div className={destaque ? "grid gap-2" : "flex flex-wrap justify-center gap-2 md:justify-start"}>
        {visiveis.map((l) => (
          <Linha
            key={l.url}
            url={l.url}
            handle={l.handle}
            legenda={`${l.label}${l.displayName ? ` · ${l.displayName}` : ""}`}
            avatarUrl={l.avatarUrl ?? null}
            destaque={destaque}
            voto={votos[l.network]}
            onVotar={(v) => votar(l.network, l.label, v)}
          />
        ))}

        {/*
          * O VSCO não é confirmado como as outras: o site está atrás do
          * Cloudflare e responde 403 a qualquer pedido — inclusive para @
          * inexistente, então nem "não existe" dá para saber —, e não há ator
          * no Apify. O endereço é montado a partir do @.
          *
          * Fica igual às demais a pedido. O aviso que o segura é o do rodapé
          * do bloco, que já vale para todas: "pode ser outra pessoa" — e agora
          * o joinha, que deixa qualquer um tirá-lo da frente.
          */}
        {mostrarVsco && (
          <Linha
            url={`https://vsco.co/${username}/gallery`}
            handle={username}
            legenda="VSCO"
            avatarUrl={null}
            destaque={destaque}
            voto={votos.vsco}
            onVotar={(v) => votar("vsco", "VSCO", v)}
            marca={
              // A marca do VSCO é um anel: círculo cheio com um furo no meio.
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground">
                <svg viewBox="0 0 36 36" className="h-5 w-5" aria-hidden>
                  <path
                    d="M18 2a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm0 10a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"
                    fill="currentColor"
                    className="text-background"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
            }
          />
        )}
      </div>

      {/* Enquanto a segunda etapa corre, a tela diz que ainda está procurando
          — sem isso, a lista parece pronta e depois muda sozinha. */}
      {destaque && procurando && (
        <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Procurando em mais redes…
        </p>
      )}

      {/* Errar escondendo tem volta; por isso o desfazer fica à mão. */}
      {ultima && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {ultima.label} escondido.
          <button
            type="button"
            onClick={() => votar(ultima.rede, ultima.label, "sim")}
            className="font-bold text-accent underline underline-offset-2"
          >
            Desfazer
          </button>
        </p>
      )}

      {procurouPagas && visiveis.length === 0 && !mostrarVsco && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Não achamos esse @ em nenhuma outra rede.
        </p>
      )}

      {falhou && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Não foi possível procurar em todas as redes agora.
        </p>
      )}

      <p className={`mt-2 text-[11px] leading-relaxed text-muted-foreground ${destaque ? "" : "text-center md:text-left"}`}>
        {visiveis.some((l) => !l.avatarUrl) ? "Onde não há foto, o desenho é ilustrativo. " : ""}
        Mesmo @ nessa rede — <b className="font-semibold">pode ser outra pessoa</b>. Diga se
        acertamos com o joinha.
      </p>
    </div>
  );
}

/**
 * Uma linha do bloco: o link para a rede e, ao lado, o joinha.
 *
 * O joinha fica **fora** do `<a>` de propósito: botão dentro de link é HTML
 * inválido, e no celular o toque acabaria abrindo a rede em vez de votar.
 */
function Linha({
  url,
  handle,
  legenda,
  avatarUrl,
  destaque,
  voto,
  onVotar,
  marca,
}: {
  url: string;
  handle: string;
  legenda: string;
  avatarUrl: string | null;
  destaque: boolean;
  voto?: "sim" | "nao";
  onVotar: (voto: "sim" | "nao") => void;
  marca?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-1 rounded-2xl border bg-muted/50 pl-2 pr-1.5 transition ${
        voto === "sim" ? "border-accent/50" : "border-border"
      } ${destaque ? "min-h-[56px]" : ""}`}
    >
      <a
        href={url}
        target="_blank"
        rel="noreferrer nofollow"
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2"
      >
        {marca ?? (
          /* A foto real quando a rede publica uma. Onde não há via oficial
             para a imagem, fica a silhueta — melhor do que fingir que temos. */
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink/40">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
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
        )}
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block truncate text-sm font-bold text-foreground">@{handle}</span>
          {/* O nome vem da própria rede, quando ela devolve. */}
          <span className="block truncate text-[11px] text-muted-foreground">{legenda}</span>
        </span>
      </a>

      <Joinha voto={voto} onVotar={onVotar} />
    </div>
  );
}

/**
 * "É essa pessoa?" — os dois botões.
 *
 * O Farejo acha contas pelo **@**, não pela identidade: quem está olhando sabe
 * se acertamos, e o servidor não tem como saber. O polegar para baixo esconde
 * a linha na hora para quem clicou, e some para todos quando gente suficiente
 * concorda — um voto sozinho não apaga um resultado certo para os outros.
 *
 * 44px de alvo nos dois, que é o mínimo para o dedo.
 */
function Joinha({
  voto,
  onVotar,
}: {
  voto?: "sim" | "nao";
  onVotar: (voto: "sim" | "nao") => void;
}) {
  const base =
    "flex h-11 w-9 items-center justify-center rounded-xl transition hover:bg-foreground/5";
  return (
    <span className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onVotar("sim")}
        aria-pressed={voto === "sim"}
        aria-label="É essa pessoa"
        title="É essa pessoa"
        className={`${base} ${voto === "sim" ? "text-accent" : "text-muted-foreground/60"}`}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onVotar("nao")}
        aria-label="Não é essa pessoa"
        title="Não é essa pessoa"
        className={`${base} text-muted-foreground/60`}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </span>
  );
}

export function ProfileHero({
  profile,
  premium,
  note,
  tracking,
  onTrack,
  locked = false,
  onVerStories,
}: {
  profile: HeroProfile;
  premium?: boolean;
  note?: string | null;
  tracking?: { saved: boolean; busy: boolean };
  onTrack?: () => void;
  /** Free plan: the button shows a lock and opens the Pro offer instead. */
  locked?: boolean;
  /** Abre os stories em tela cheia; ausente quando não há nenhum. */
  onVerStories?: () => void;
  /** Which badge to show beside the name. */
  /**
   * Abre a aba de stories. A foto com anel é o lugar onde todo mundo procura
   * story — sem isto, ele ficava escondido atrás do seletor de seções.
   * Não pede nada ao provedor: só troca de aba.
   */
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
          {/* O anel colorido é a porta dos stories, como no Instagram: toca na
              foto e eles abrem em tela cheia. Sem `onVerStories` (ou quando já
              se sabe que não há nenhum), fica o aro rosa da marca. */}
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
              title="No seu Faro AI"
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

          {/*
            * Já está no Faro AI: o botão vira caminho, não aviso.
            *
            * Antes ele ficava desativado dizendo "No seu Faro AI" — informava um
            * estado e não levava a lugar nenhum, bem no momento em que a
            * pessoa mais quer ver o que o Faro AI já encontrou. Agora é um link
            * para o painel daquele perfil.
            */}
          {onTrack && tracking?.saved ? (
            <NextLink
              href={`/rastros/${encodeURIComponent(profile.username)}`}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-muted px-5 text-sm font-bold text-foreground transition hover:opacity-90 md:w-auto"
            >
              <PawPrint className="h-4 w-4 fill-pink text-accent" />
              Ir para o painel do Faro AI
              <ArrowRight className="h-4 w-4" />
            </NextLink>
          ) : (
            onTrack && (
              <button
                type="button"
                onClick={onTrack}
                disabled={tracking?.busy}
                className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-pink px-5 text-sm font-bold text-ink transition hover:opacity-90 md:w-auto"
              >
                {tracking?.busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : locked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <PawPrint className="h-4 w-4" />
                )}
                Colocar no Faro AI
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
