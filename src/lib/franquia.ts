/**
 * As franquias: quanto de cada coisa a conta já usou neste ciclo.
 *
 * ## Reservar antes, devolver se não entregou
 *
 * `reservar` incrementa o contador **no banco, numa instrução só, com o teto
 * na condição**. Duas abas pedindo ao mesmo tempo não passam do limite: a
 * segunda não encontra linha para atualizar e volta negada. Só depois da
 * reserva a chamada paga é feita.
 *
 * Se a entrega falhar (provedor fora, perfil inexistente), `devolver` desfaz
 * a reserva: falha sem entrega não consome a franquia do cliente. A chamada
 * que o provedor cobrou continua no registro de custo (`custo.ts`) — a
 * empresa pagou, e isso não some.
 *
 * ## O que não acumula
 *
 * A chave inclui o início do ciclo. Ciclo novo, linha nova: nada precisa ser
 * zerado e nada sobra do ciclo anterior.
 */
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { direitosDe, fimDoCiclo, inicioDoCiclo } from "@/lib/direitos";
import type { PlanConfig } from "@/lib/plans";

export type Tipo =
  | "analise" // análise completa nova
  | "perfil" // perfil que entrou no acompanhamento neste ciclo
  | "coleta" // passagem do acompanhamento (a primeira conta)
  | "pergunta" // Pergunte ao Faro AI / Chat
  | "resumo" // story processado pela IA pela primeira vez
  | "alerta" // avaliação de um evento contra o "Me avise quando…"
  | "sugestao" // busca de sugestões que chegou ao provedor
  | "redes" // consulta de outras redes
  | "perfil_basico" // cartão do perfil que chegou ao provedor
  | `teto:${string}` // tetos diários de segurança (teto-diario.ts)
  | `perfil:${string}`; // marca de qual @ entrou no acompanhamento neste ciclo

/** O teto de cada tipo, lido do plano. */
export function tetoDe(config: PlanConfig, tipo: Tipo): number {
  switch (tipo) {
    case "analise":
      return config.maxConsults;
    case "perfil":
      return config.maxProfiles;
    case "coleta":
      return config.coletasPorCiclo;
    case "pergunta":
      return config.perguntas;
    case "resumo":
      return config.resumos;
    case "alerta":
      return config.avaliacoesAlerta;
    case "sugestao":
      return config.sugestoes;
    case "redes":
      return config.redes;
    case "perfil_basico":
      return config.cartoes;
    default:
      return 0;
  }
}

export interface Reserva {
  ok: boolean;
  usados: number;
  limite: number;
  /** A chave da linha, para devolver depois. */
  chave: { dono: string; tipo: Tipo; ciclo: Date };
}

/**
 * Tenta usar `n` do tipo. Atômico: o teto está na cláusula do UPDATE.
 *
 * `dono` é o id da conta, ou `v:<visitante>` para quem não tem conta.
 * `limite` é o teto a aplicar; `Infinity` passa sempre (e ainda assim conta,
 * para o registro).
 */
export async function reservarBruto(
  dono: string,
  tipo: Tipo,
  ciclo: Date,
  limite: number,
  n = 1,
): Promise<Reserva> {
  const chave = { dono, tipo, ciclo };
  if (limite <= 0) return { ok: false, usados: 0, limite, chave };

  const semTeto = !Number.isFinite(limite);
  // INSERT … ON CONFLICT DO UPDATE … WHERE: a linha só muda se couber. Quando
  // não cabe, o RETURNING volta vazio — e isso é a recusa.
  //
  // As colunas são `timestamp` sem fuso, gravadas em UTC pelo Prisma. Aqui a
  // conversão é explícita: sem ela o banco usa o fuso da sessão, e a linha
  // gravada não bate com a que o Prisma procura (medido: 3h de diferença).
  const linhas = await prisma.$queryRawUnsafe<{ used: number }[]>(
    `INSERT INTO usage_counters ("userId", kind, "cycleStart", used, "updatedAt")
     SELECT $1, $2, ($3::timestamptz AT TIME ZONE 'UTC'), $4::int, (now() AT TIME ZONE 'UTC')
     WHERE $5::boolean OR $4::int <= $6::int
     ON CONFLICT ("userId", kind, "cycleStart")
     DO UPDATE SET used = usage_counters.used + $4::int, "updatedAt" = (now() AT TIME ZONE 'UTC')
     WHERE $5::boolean OR usage_counters.used + $4::int <= $6::int
     RETURNING used`,
    dono,
    tipo,
    ciclo,
    n,
    semTeto,
    semTeto ? 0 : limite,
  );

  if (linhas.length) return { ok: true, usados: Number(linhas[0].used), limite, chave };
  const atual = await usadosBruto(dono, tipo, ciclo);
  return { ok: false, usados: atual, limite, chave };
}

/** Desfaz uma reserva que não virou entrega. Nunca deixa o contador negativo. */
export async function devolver(r: Reserva, n = 1): Promise<void> {
  if (!r.ok) return;
  await prisma.$executeRawUnsafe(
    `UPDATE usage_counters SET used = GREATEST(used - $4::int, 0), "updatedAt" = (now() AT TIME ZONE 'UTC')
     WHERE "userId" = $1 AND kind = $2 AND "cycleStart" = ($3::timestamptz AT TIME ZONE 'UTC')`,
    r.chave.dono,
    r.chave.tipo,
    r.chave.ciclo,
    n,
  );
}

export async function usadosBruto(dono: string, tipo: Tipo, ciclo: Date): Promise<number> {
  const linha = await prisma.usageCounter.findUnique({
    where: { userId_kind_cycleStart: { userId: dono, kind: tipo, cycleStart: ciclo } },
    select: { used: true },
  });
  return linha?.used ?? 0;
}

type Conta = Pick<User, "id" | "email" | "plan" | "planEndsAt" | "planStartedAt">;

/** Reserva contra o plano da conta, no ciclo dela. */
export async function reservar(user: Conta, tipo: Tipo, n = 1, tetoExtra = 0): Promise<Reserva> {
  const { config } = direitosDe(user);
  return reservarBruto(user.id, tipo, inicioDoCiclo(user), tetoDe(config, tipo) + tetoExtra, n);
}

export interface Saldo {
  usados: number;
  limite: number;
  restam: number;
}

/** Quanto já foi usado e quanto resta — para a tela, sem reservar nada. */
export async function saldo(user: Conta, tipo: Tipo, tetoExtra = 0): Promise<Saldo> {
  const { config } = direitosDe(user);
  const limite = tetoDe(config, tipo) + tetoExtra;
  const usados = await usadosBruto(user.id, tipo, inicioDoCiclo(user));
  return { usados, limite, restam: Math.max(0, limite - usados) };
}

export interface ResumoFranquia {
  nome: string;
  cobranca: string | null;
  /** Quando o ciclo vira, em ISO — a tela formata. */
  renovaEm: string | null;
  itens: { label: string; valor: string; cheio: boolean }[];
}

const horas = (h: number) =>
  !Number.isFinite(h) ? "sem prazo" : h % 24 === 0 ? `${h / 24} dia${h === 24 ? "" : "s"}` : `${h} horas`;

/**
 * O que a pessoa já usou do plano neste ciclo, pronto para a tela. Calculado
 * no servidor, com os mesmos contadores que as rotas conferem — o número que
 * a tela mostra é o número que a porta aplica.
 */
export async function resumoDaFranquia(
  user: Conta & { revelacaoUsername?: string | null },
): Promise<ResumoFranquia> {
  const { config, admin } = direitosDe(user);
  const fim = fimDoCiclo(user);
  const cobranca =
    config.billing === "weekly" ? "semanal" : config.billing === "monthly" ? "mensal" : config.billing === "yearly" ? "anual" : null;

  if (admin) {
    return { nome: "Admin", cobranca: null, renovaEm: null, itens: [{ label: "Franquias", valor: "sem limite comercial", cheio: false }] };
  }
  if (config.maxConsults <= 0 && config.maxProfiles <= 0) {
    return {
      nome: config.name,
      cobranca: null,
      renovaEm: null,
      itens: [
        {
          label: "Revelação grátis",
          valor: user.revelacaoUsername ? `usada em @${user.revelacaoUsername}` : "disponível",
          cheio: !!user.revelacaoUsername,
        },
      ],
    };
  }

  const fmt = (s: Saldo) => ({ valor: `${s.usados} de ${s.limite}`, cheio: s.usados >= s.limite });
  const itens: ResumoFranquia["itens"] = [];
  itens.push({ label: "Análises novas", ...fmt(await saldo(user, "analise")) });
  if (config.maxProfiles > 0) {
    itens.push({ label: "Coletas", ...fmt(await saldo(user, "coleta")) });
    if (config.perguntas > 0 && Number.isFinite(config.perguntas)) itens.push({ label: "Perguntas", ...fmt(await saldo(user, "pergunta")) });
    if (config.resumos > 0 && Number.isFinite(config.resumos)) itens.push({ label: "Resumos de stories", ...fmt(await saldo(user, "resumo")) });
    if (config.alertasEscritos > 0 && Number.isFinite(config.avaliacoesAlerta)) {
      itens.push({ label: "Avaliações do alerta", ...fmt(await saldo(user, "alerta")) });
    }
  }
  itens.push({ label: "Stories visíveis", valor: horas(config.storiesHours), cheio: false });

  return { nome: config.name, cobranca, renovaEm: fim?.toISOString() ?? null, itens };
}
