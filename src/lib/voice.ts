/**
 * Farejo's voice. Faro — the dog — narrates the product, so status messages,
 * alerts and empty states read like a curious friend rather than a dashboard.
 *
 * Copy lives here so every screen speaks the same way. Positioning rule: this
 * is discovery of PUBLIC activity, never "spying" — playful about curiosity,
 * but nothing that suggests access to private data.
 */

/**
 * The official phrases, as organised in the brand book. Screens pick from
 * these — nothing invents its own tagline — so the brand never gets pinned to
 * a single joke.
 */
export const BRAND = {
  /** The official slogan. Signs the brand everywhere. */
  signature: "Curiosidade conecta.",
  /** The core concept / headline. */
  concept: "Fareje além do @.",
  /** The strong campaign line. */
  campaign: "Seu faro estava certo.",
  /** Built for big type: billboard, landing page, onboarding. */
  manifesto: ["Tem coisa que você vê.", "Tem coisa que você fareja."] as const,
  /** The rest of the universe — campaign headlines. */
  phrases: {
    rastro: "Toda curiosidade deixa um rastro.",
    umArroba: "Um @. Muitas pistas.",
    sigaAsPistas: "Siga as pistas.",
    coisaNova: "Tem coisa nova no ar.",
    despercebido: "Nada passa despercebido.",
    farejadas: "Algumas respostas precisam ser farejadas.",
    vocePergunta: "Você pergunta. O Farejo encontra.",
    curiosidadeChamou: "A curiosidade chamou. O Farejo respondeu.",
    oQueMudou: "Descubra o que mudou.",
    alguemNovo: "Tem alguém novo por aqui. 👀",
    achamosUmRastro: "Achamos um rastro.",
    conectaOsPontos: "O Instagram mostra. O Farejo conecta os pontos.",
    prestaAtencao: "Você não é curioso. Só presta atenção. 👀",
    naoProcure: "Não procure de novo. Deixe o Farejo acompanhar por você.",
    ligado24h: "Seu faro, ligado 24h.",
  },
} as const;

/** Rotating lines for the analysis loading screen. */
export const LOADING_LINES = [
  "Farejando…",
  "Procurando pistas…",
  "Seguindo o rastro…",
  "Cheirando os cantinhos do @…",
  "Faro está investigando…",
  "Quase encontramos…",
  "Organizando as pistas…",
] as const;

/** Shown for a beat when the analysis finishes. */
export const LOADING_DONE = "Achei! 🐶";

export function pistas(n: number): string {
  return n === 1 ? "1 pista" : `${n} pistas`;
}

export function novidades(n: number): string {
  return n === 1 ? "1 novidade" : `${n} novidades`;
}

export interface ActivityLevel {
  emoji: string;
  label: string;
}

/**
 * How busy a profile has been, by volume of detected changes in the last seven
 * days. Purely a count — it says nothing about who or why.
 */
export function activityLevel(changesLast7Days: number): ActivityLevel {
  if (changesLast7Days <= 0) return { emoji: "😴", label: "Quieto" };
  if (changesLast7Days <= 3) return { emoji: "🐾", label: "Algumas pistas" };
  if (changesLast7Days <= 9) return { emoji: "👀", label: "Movimentado" };
  return { emoji: "🔥", label: "Muito movimentado" };
}

export type PistaKind = "follow" | "unfollow" | "interaction";

/** Headline for a single detected change. */
export function pistaHeadline(kind: PistaKind): { emoji: string; title: string } {
  if (kind === "follow") return { emoji: "🐶", title: "Faro encontrou alguém novo." };
  if (kind === "unfollow") return { emoji: "👀", title: "Esse rastro sumiu." };
  return { emoji: "❤️", title: "Rolou interação." };
}

/** Greeting for the Pro home, by local hour. */
export function greeting(hour: number): string {
  if (hour < 5) return "Boa madrugada 👀";
  if (hour < 12) return "Bom dia 👀";
  if (hour < 18) return "Boa tarde 👀";
  return "Boa noite 👀";
}

/**
 * Textos de bloqueio. A regra: dizer o que a pessoa ganha ao desbloquear, não
 * apenas que está bloqueado.
 */
export const BLOQUEIOS = {
  pista: {
    titulo: "Esta pista está guardada.",
    corpo: "Desbloqueie este perfil com o Farejador e veja tudo o que o Faro encontrou.",
    acao: "Desbloquear perfil completo",
  },
  foraDoFaro: {
    titulo: "Este perfil ainda não está no Faro.",
    corpo: "Coloque-o no Faro para receber as mudanças e os alertas todo dia.",
    acao: "Ver planos com Faro",
  },
  faroCheio: {
    titulo: "Seu Faro está cheio.",
    corpo: "Troque um perfil acompanhado ou passe para um plano com mais vagas.",
    acao: "Gerenciar meu Faro",
  },
  semConta: {
    titulo: "Não deixe essa pista escapar.",
    corpo: "Crie sua conta grátis para guardar este perfil e desbloquear 1 pista à sua escolha.",
    acao: "Criar conta e escolher minha pista",
    alternativa: "Continuar sem conta",
  },
} as const;
