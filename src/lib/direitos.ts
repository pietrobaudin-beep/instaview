/**
 * O que ESTA conta pode fazer agora — plano efetivo, Admin e ciclo.
 *
 * Toda rota que gasta pergunta aqui, no servidor. Esconder um botão na tela
 * não controla nada.
 *
 * ## Admin
 *
 * Não é plano. É a lista `ADMIN_EMAILS` do servidor, a mesma da área /admin.
 * Cadastro, pagamento e edição de conta mexem em `user.plan` — nunca nesta
 * lista —, então nenhum deles concede Admin. O login é por código enviado ao
 * e-mail, o que prova que quem entrou lê aquela caixa.
 *
 * Admin não tem franquia comercial, mas continua com as travas de segurança:
 * cadência mínima, teto diário da IA, proteção contra chamada duplicada. E
 * o que ele gasta vai para o registro de custo marcado como `admin`.
 */
import type { Plan, User } from "@prisma/client";
import { isAdminEmail } from "@/lib/admin";
import { PLANS, SEM_TETO, type PlanConfig } from "@/lib/plans";

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  return isAdminEmail(user?.email);
}

/** O que o Admin tem: tudo, sem franquia — mas com as travas de segurança. */
export const ADMIN: PlanConfig = {
  ...PLANS.DETETIVE,
  name: "Admin",
  para: "Acesso interno.",
  billing: "free",
  priceMonthly: 0,
  maxConsults: SEM_TETO,
  maxProfiles: SEM_TETO,
  // A cadência continua diária: sem franquia não quer dizer sem freio. Uma
  // leitura por dia já pega todo story de 24h; mais que isso é gasto sem ganho.
  cadenciaHoras: 24,
  coletasPorCiclo: SEM_TETO,
  atualizarAgoraHoras: 1,
  perguntas: SEM_TETO,
  resumos: SEM_TETO,
  buscaStories: true,
  alertasEscritos: SEM_TETO,
  avaliacoesAlerta: SEM_TETO,
  sugestoes: SEM_TETO,
  redes: SEM_TETO,
  cartoes: SEM_TETO,
  storiesHours: SEM_TETO,
  favoritos: SEM_TETO,
  favoritosMB: SEM_TETO,
  storiesSalvosMes: SEM_TETO,
  refreshesPorDia: 24,
  historyDays: SEM_TETO,
  stripePriceEnv: undefined,
  features: [],
  avisos: [],
};

/**
 * O plano que vale agora. Um plano com `planEndsAt` no passado volta a ser
 * Curioso — sem apagar nada, só sem os direitos.
 */
export function planoEfetivo(
  user: Pick<User, "plan" | "planEndsAt"> | null | undefined,
  agora = new Date(),
): Plan {
  if (!user) return "FREE";
  if (user.planEndsAt && user.planEndsAt <= agora) return "FREE";
  return user.plan;
}

export interface Direitos {
  admin: boolean;
  plano: Plan;
  config: PlanConfig;
}

export function direitosDe(
  user: Pick<User, "email" | "plan" | "planEndsAt"> | null | undefined,
): Direitos {
  if (user && isAdmin(user)) return { admin: true, plano: planoEfetivo(user), config: ADMIN };
  const plano = planoEfetivo(user);
  return { admin: false, plano, config: PLANS[plano] };
}

/**
 * Até antes de 24/09 os tetos eram contados por mês de calendário. As contas
 * antigas (sem `planStartedAt`) seguem assim, a partir de 24/09 — mudar a
 * regra não pode trancar ninguém para trás.
 */
const INICIO_DAS_FRANQUIAS = new Date("2026-09-24T00:00:00Z");

/** O começo do ciclo em que `agora` cai. `null` = a vida da conta. */
export function inicioDoCiclo(
  user: Pick<User, "plan" | "planEndsAt" | "planStartedAt" | "email"> | null | undefined,
  agora = new Date(),
): Date {
  const { config, admin } = direitosDe(user);
  // Admin e Curioso: um ciclo só, desde sempre. Para Admin nada é contado
  // contra teto; o registro serve só à conta de custo.
  if (admin) return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
  if (!config.ciclo) return new Date(0);

  const ancora = user?.planStartedAt;
  if (!ancora) {
    const mes = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1));
    return mes > INICIO_DAS_FRANQUIAS ? mes : INICIO_DAS_FRANQUIAS;
  }

  if (config.ciclo === "semana") {
    const semana = 7 * 24 * 60 * 60 * 1000;
    const n = Math.max(0, Math.floor((agora.getTime() - ancora.getTime()) / semana));
    return new Date(ancora.getTime() + n * semana);
  }

  // Mensal, no mesmo dia da âncora. Dia 31 num mês de 30 cai no último dia —
  // e nunca cria um 31º dia de coleta fora da franquia, porque a franquia é
  // por ciclo, não por dia.
  let inicio = somarMeses(ancora, 0);
  for (let m = 1; ; m++) {
    const proximo = somarMeses(ancora, m);
    if (proximo > agora) return inicio;
    inicio = proximo;
  }
}

/** Quando o ciclo atual acaba — o que a tela mostra como "renova em". */
export function fimDoCiclo(
  user: Pick<User, "plan" | "planEndsAt" | "planStartedAt" | "email"> | null | undefined,
  agora = new Date(),
): Date | null {
  const { config, admin } = direitosDe(user);
  if (admin || !config.ciclo) return null;
  const inicio = inicioDoCiclo(user, agora);
  if (config.ciclo === "semana") return new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ancora = user?.planStartedAt;
  if (!ancora) return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1));
  for (let m = 1; ; m++) {
    const proximo = somarMeses(ancora, m);
    if (proximo > inicio) return proximo;
  }
}

function somarMeses(d: Date, meses: number): Date {
  const alvo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d.getUTCDate(), ultimo));
  alvo.setUTCHours(d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), 0);
  return alvo;
}
