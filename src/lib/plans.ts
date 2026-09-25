/**
 * Os planos e o que cada um dá. A fonte única: a tela lê daqui, o servidor
 * confere daqui, e a Stripe mapeia price id → plano também por aqui.
 *
 * ## A estrutura de 24/09
 *
 * Curioso (grátis, com ou sem conta) → Farejador (R$ 9,90, avulso) →
 * Farejador + (R$ 19,90, semanal) → Faro de Cão (R$ 39,90/mês) → Faro de
 * Detetive (R$ 59,90/mês). Admin não é plano: é permissão, em `direitos.ts`.
 *
 * Cada número abaixo é uma **franquia por ciclo**, contada no servidor em
 * `franquia.ts`. "Todas as funcionalidades" quer dizer acesso às ferramentas
 * dentro da franquia — nunca uso ilimitado.
 *
 * ## Os planos antigos
 *
 * WEEK, PRO e AGENCY ficam no enum porque há contas com eles. Mantêm os
 * direitos que tinham (`legado: true`), não aparecem na vitrine nem no
 * checkout, e saem na transição combinada com o dono.
 */
import type { Plan } from "@prisma/client";

/** Sem teto. Só para Admin e para os planos antigos, que já eram assim. */
export const SEM_TETO = Number.POSITIVE_INFINITY;

export interface PlanConfig {
  id: Plan;
  name: string;
  /** Uma linha dizendo para quem é. */
  para?: string;
  /** Como é cobrado. */
  billing?: "free" | "weekly" | "monthly" | "yearly";
  /** Preço exibido, em reais, pelo período de `billing`. Quem cobra é a Stripe. */
  priceMonthly: number;
  priceYearly?: number;
  /** Plano antigo: mantém direitos, some da vitrine e do checkout. */
  legado?: boolean;
  /** Duração do ciclo das franquias. `null` = a vida da conta (Curioso). */
  ciclo: "semana" | "mes" | null;

  /** Análises completas novas por ciclo. Reabrir uma salva não conta. */
  maxConsults: number;
  /** Perfis que podem ENTRAR no acompanhamento por ciclo (sem troca). */
  maxProfiles: number;
  /** De quantas em quantas horas o acompanhamento coleta. */
  cadenciaHoras: number;
  /** Coletas por ciclo, contando a primeira. */
  coletasPorCiclo: number;
  /** "Atualizar agora": intervalo mínimo desde a última coleta, ou null. */
  atualizarAgoraHoras: number | null;

  perguntas: number;
  resumos: number;
  /** Busca por assunto dentro dos stories já processados. */
  buscaStories: boolean;
  /** Alertas "Me avise quando…" ativos ao mesmo tempo. */
  alertasEscritos: number;
  /** Quantas vezes por ciclo um evento pode ser avaliado contra o alerta. */
  avaliacoesAlerta: number;

  /** Buscas de sugestão que chegam ao provedor (cache não conta). */
  sugestoes: number;
  /** Consultas de outras redes, sob demanda. */
  redes: number;
  /**
   * Cartões de perfil (foto, nome, números) que chegam ao provedor por ciclo.
   * É o que se paga para confirmar o perfil antes de gastar uma análise; o que
   * vem do cache compartilhado não conta. Igual ao número de análises: o
   * cartão lido para confirmar fica 24h no cache e a análise o reaproveita,
   * então na prática não soma leitura ao orçamento do plano.
   */
  cartoes: number;

  /**
   * Por quantas horas, contadas da publicação, um story capturado fica
   * visível. `SEM_TETO` = enquanto estiver guardado.
   */
  storiesHours: number;
  /** Stories com estrela, e o espaço que as miniaturas deles podem ocupar. */
  favoritos: number;
  favoritosMB: number;

  /** Mantidos por compatibilidade com telas antigas. */
  storiesSalvosMes: number;
  refreshesPorDia: number;
  minIntervalMinutes: number;
  historyDays: number;
  alerts: boolean;
  team: boolean;
  exportAndApi: boolean;

  stripePriceEnv?: string;
  features: string[];
  /** O que o plano NÃO faz, dito na oferta. */
  avisos?: string[];
}

/** O Curioso e o Farejador (avulso) não acompanham, não perguntam, não resumem. */
const NADA_DE_FARO = {
  maxProfiles: 0,
  cadenciaHoras: 24,
  coletasPorCiclo: 0,
  atualizarAgoraHoras: null,
  perguntas: 0,
  resumos: 0,
  buscaStories: false,
  alertasEscritos: 0,
  avaliacoesAlerta: 0,
  favoritos: 0,
  favoritosMB: 0,
  storiesSalvosMes: 0,
  refreshesPorDia: 0,
  alerts: false,
  team: false,
  exportAndApi: false,
} as const;

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    id: "FREE",
    // "Curioso" é a CONTA grátis. Quem entra sem conta não tem plano nem nome:
    // é visitante, e a tela o convida a criar a conta para desbloquear uma
    // informação.
    name: "Curioso",
    para: "A conta grátis: desbloqueie uma informação de um perfil.",
    billing: "free",
    priceMonthly: 0,
    ciclo: null,
    ...NADA_DE_FARO,
    // Não é análise: é a revelação do destaque, uma por conta, no mesmo perfil.
    maxConsults: 0,
    sugestoes: 1,
    redes: 0,
    cartoes: 1,
    storiesHours: 0,
    minIntervalMinutes: 24 * 60,
    historyDays: 0,
    features: [
      "Conta grátis, criada só com o seu e-mail",
      "Desbloqueie 1 informação: quem mais aparece nas interações de um perfil",
      "Busca de @ e cartão do perfil",
      "Prévia da análise, com os resultados borrados",
    ],
    avisos: [
      "Uma informação por conta, no perfil que você escolher",
      "Sem stories, sem acompanhamento e sem o Faro AI",
    ],
  },

  FAREJADOR_MAIS: {
    id: "FAREJADOR_MAIS",
    name: "Farejador +",
    para: "Uma semana para farejar mais perfis.",
    billing: "weekly",
    priceMonthly: 19.9,
    ciclo: "semana",
    ...NADA_DE_FARO,
    maxConsults: 2,
    sugestoes: 2,
    redes: 2,
    cartoes: 2,
    // 24 horas além da janela normal do Instagram.
    storiesHours: 48,
    minIntervalMinutes: 24 * 60,
    historyDays: 7,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_FAREJADOR_MAIS",
    features: [
      "2 análises completas por semana",
      "Resultados salvos: reabrir não faz nova coleta",
      "Stories capturados pelo Farejo visíveis por até 48 horas da publicação — 24 horas a mais",
      "Até 2 consultas de outras redes",
    ],
    avisos: [
      "Mostra só os stories que o Farejo capturou; não recupera stories nunca coletados",
      "Sem acompanhamento automático, alertas ou ferramentas de IA",
    ],
  },

  CAO: {
    id: "CAO",
    name: "Faro de Cão",
    para: "Acompanhe um perfil a cada três dias.",
    billing: "monthly",
    priceMonthly: 39.9,
    ciclo: "mes",
    maxConsults: 1,
    maxProfiles: 1,
    cadenciaHoras: 72,
    coletasPorCiclo: 10,
    atualizarAgoraHoras: null,
    perguntas: 5,
    resumos: 5,
    buscaStories: false,
    alertasEscritos: 0,
    avaliacoesAlerta: 0,
    sugestoes: 2,
    redes: 1,
    cartoes: 1,
    storiesHours: 72,
    favoritos: 5,
    favoritosMB: 10,
    storiesSalvosMes: 5,
    refreshesPorDia: 0,
    minIntervalMinutes: 72 * 60,
    historyDays: 90,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_CAO",
    features: [
      "1 perfil acompanhado, com coleta a cada 3 dias (até 10 por mês)",
      "1 análise completa nova por mês",
      "Quem ele começou a seguir e quem deixou, entre uma coleta e outra",
      "Stories capturados visíveis por 3 dias, e até 5 favoritos",
      "5 perguntas e 5 resumos de stories com o Faro AI por mês",
      "Painel, Rastros, Pistas, histórico e \"Desde a sua última visita\"",
      "Alertas dentro do app",
    ],
    avisos: [
      "Acompanha a cada três dias, não diariamente",
      "Stories publicados e apagados entre duas coletas podem não ser capturados",
      "O histórico mostra as mudanças detectadas nas coletas, não toda a atividade",
    ],
  },

  DETETIVE: {
    id: "DETETIVE",
    name: "Faro de Detetive",
    para: "Acompanhamento diário e todas as ferramentas do Faro AI.",
    billing: "monthly",
    priceMonthly: 59.9,
    ciclo: "mes",
    maxConsults: 3,
    maxProfiles: 1,
    cadenciaHoras: 24,
    coletasPorCiclo: 30,
    atualizarAgoraHoras: 24,
    perguntas: 30,
    resumos: 30,
    buscaStories: true,
    alertasEscritos: 1,
    avaliacoesAlerta: 150,
    sugestoes: 5,
    redes: 3,
    cartoes: 3,
    storiesHours: 7 * 24,
    favoritos: 20,
    favoritosMB: 30,
    storiesSalvosMes: 20,
    refreshesPorDia: 1,
    minIntervalMinutes: 24 * 60,
    historyDays: 365,
    alerts: true,
    team: false,
    exportAndApi: false,
    stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_DETETIVE",
    features: [
      "1 perfil acompanhado todo dia (até 30 coletas por mês)",
      "3 análises completas novas por mês",
      "Stories capturados visíveis por 7 dias, e até 20 favoritos",
      "30 perguntas e 30 resumos de stories com o Faro AI por mês",
      "Busca por assunto nos stories já lidos",
      "1 alerta \"Me avise quando…\", com até 150 avaliações por mês",
      "\"Atualizar agora\": antecipa uma coleta, com 24 horas entre elas",
      "Todo o painel, as pistas, o histórico e a gestão dos dados",
    ],
    avisos: [
      "Todas as funcionalidades dentro das franquias do mês — não é uso ilimitado",
      "Diário não é tempo real: stories que duram menos que o intervalo podem escapar",
    ],
  },

  // ---- Planos antigos: direitos preservados até a transição. ----

  WEEK: {
    id: "WEEK",
    name: "Faro de Cão (antigo)",
    billing: "weekly",
    priceMonthly: 14.9,
    legado: true,
    ciclo: "mes",
    maxConsults: 3,
    maxProfiles: 1,
    cadenciaHoras: 24,
    coletasPorCiclo: 31,
    atualizarAgoraHoras: 1,
    perguntas: SEM_TETO,
    resumos: SEM_TETO,
    buscaStories: true,
    alertasEscritos: 1,
    avaliacoesAlerta: SEM_TETO,
    sugestoes: 30,
    redes: 3,
    cartoes: 30,
    storiesHours: 48,
    favoritos: 10,
    favoritosMB: 30,
    storiesSalvosMes: 10,
    refreshesPorDia: 3,
    minIntervalMinutes: 24 * 60,
    historyDays: 90,
    alerts: true,
    team: false,
    exportAndApi: false,
    features: [],
  },
  PRO: {
    id: "PRO",
    name: "Farejo PRO (antigo)",
    billing: "monthly",
    priceMonthly: 29.9,
    legado: true,
    ciclo: "mes",
    maxConsults: 5,
    maxProfiles: 1,
    cadenciaHoras: 24,
    coletasPorCiclo: 31,
    atualizarAgoraHoras: 1,
    perguntas: SEM_TETO,
    resumos: SEM_TETO,
    buscaStories: true,
    alertasEscritos: 1,
    avaliacoesAlerta: SEM_TETO,
    sugestoes: 30,
    redes: 5,
    cartoes: 30,
    storiesHours: SEM_TETO,
    favoritos: SEM_TETO,
    favoritosMB: SEM_TETO,
    storiesSalvosMes: SEM_TETO,
    refreshesPorDia: 5,
    minIntervalMinutes: 24 * 60,
    historyDays: 365,
    alerts: true,
    team: false,
    exportAndApi: false,
    features: [],
  },
  AGENCY: {
    id: "AGENCY",
    name: "Faro Detetive (antigo)",
    billing: "yearly",
    priceMonthly: 179 / 12,
    priceYearly: 179,
    legado: true,
    ciclo: "mes",
    maxConsults: 2,
    maxProfiles: 1,
    cadenciaHoras: 24,
    coletasPorCiclo: 31,
    atualizarAgoraHoras: 1,
    perguntas: SEM_TETO,
    resumos: SEM_TETO,
    buscaStories: true,
    alertasEscritos: 1,
    avaliacoesAlerta: SEM_TETO,
    sugestoes: 30,
    redes: 2,
    cartoes: 30,
    storiesHours: 72,
    favoritos: 50,
    favoritosMB: 30,
    storiesSalvosMes: 50,
    refreshesPorDia: 3,
    minIntervalMinutes: 24 * 60,
    historyDays: SEM_TETO,
    alerts: true,
    team: true,
    exportAndApi: true,
    features: [],
  },
};

/**
 * Farejador: uma análise completa de UM perfil, paga uma vez. Não é plano —
 * é um `ProfileUnlock` com prazo.
 */
export const SINGLE_UNLOCK = {
  name: "Farejador",
  para: "Uma pessoa, uma análise completa. Sem assinatura.",
  price: 9.9,
  /** O resultado fica aberto por 7 dias, com a data da coleta. */
  diasDeAcesso: 7,
  /** Stories: a janela normal, 24 horas da publicação. Não é a dos 7 dias. */
  storiesHours: 24,
  sugestoes: 1,
  redes: 1,
  stripePriceEnv: "NEXT_PUBLIC_STRIPE_PRICE_SINGLE",
  features: [
    "Análise completa de 1 perfil, sem borrão",
    "Classificação estimada das contas seguidas, destaque e ranking de interações",
    "Contas recorrentes, marcações e informações da conta",
    "Novos seguindo, quando houver base para saber",
    "Stories disponíveis no momento da coleta",
    "Resultado aberto por 7 dias, com a data da coleta",
  ],
  avisos: ["Sem acompanhamento, atualização, alertas ou ferramentas do Faro AI"],
} as const;

/** A ordem da vitrine, do grátis ao topo. Os antigos ficam de fora. */
export const VITRINE: Plan[] = ["FREE", "FAREJADOR_MAIS", "CAO", "DETETIVE"];

/** Planos que acompanham perfis (têm Faro AI). */
export function temFaro(plan: Plan): boolean {
  return PLANS[plan].maxProfiles > 0;
}

export function planFor(plan: Plan): PlanConfig {
  return PLANS[plan];
}

/** Clamp a requested interval to the plan's allowed minimum. */
export function clampInterval(plan: Plan, requestedMinutes: number): number {
  return Math.max(planFor(plan).minIntervalMinutes, requestedMinutes);
}
