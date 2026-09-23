/**
 * "Essa conta é mesmo da pessoa?" — o joinha das outras redes.
 *
 * O Farejo acha contas pelo **@**, não pela identidade: o mesmo @ no TikTok
 * pode ser de outra pessoa, e não há como o servidor saber. Quem sabe é quem
 * está olhando. O joinha é esse conhecimento voltando para o produto.
 *
 * Duas formas de esconder, de propósito:
 *
 * 1. **Para quem votou**, na hora. Se você diz que está errado, some para
 *    você — sem esperar mais ninguém concordar. É o seu perfil, é a sua
 *    resposta.
 * 2. **Para todo mundo**, só com {@link LIMITE_GLOBAL} pessoas dizendo o
 *    mesmo e mais votos contra do que a favor. Um voto sozinho não apaga um
 *    resultado certo para os outros: bastaria uma pessoa enganada, ou alguém
 *    querendo esconder a própria conta.
 *
 * Fica em `section_cache`, sem tabela nova.
 */
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Quantos "está errado" são precisos para a rede sumir para todo mundo. */
export const LIMITE_GLOBAL = 3;

/** Teto de votantes guardados por perfil — os votos seguem contando depois. */
const MAX_VOTANTES = 300;

const SECAO = "net-votos";

export type Voto = "sim" | "nao";

interface VotosDaRede {
  sim: number;
  nao: number;
  /** Quem votou o quê, para trocar de ideia não contar duas vezes. */
  quem: Record<string, Voto>;
}

type Placar = Record<string, VotosDaRede>;

function vazio(): VotosDaRede {
  return { sim: 0, nao: 0, quem: {} };
}

async function ler(username: string): Promise<Placar> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: SECAO } } })
    .catch(() => null);
  return ((row?.data as unknown as Placar) ?? {}) as Placar;
}

/** Registra (ou troca) o voto de uma identidade. Devolve o placar da rede. */
export async function votar(
  username: string,
  rede: string,
  chave: string,
  voto: Voto,
): Promise<{ sim: number; nao: number }> {
  const placar = await ler(username);
  const atual = placar[rede] ?? vazio();
  const anterior = atual.quem?.[chave];

  if (anterior === voto) return { sim: atual.sim, nao: atual.nao };

  // Trocar de ideia tira o voto antigo antes de pôr o novo.
  if (anterior === "sim") atual.sim = Math.max(0, atual.sim - 1);
  if (anterior === "nao") atual.nao = Math.max(0, atual.nao - 1);

  if (voto === "sim") atual.sim += 1;
  else atual.nao += 1;

  atual.quem = atual.quem ?? {};
  // Passado o teto, o voto ainda conta — só não guardamos mais quem foi. O
  // preço é a pessoa poder votar de novo; o alternativa seria a linha do
  // banco crescer sem fim.
  if (anterior !== undefined || Object.keys(atual.quem).length < MAX_VOTANTES) {
    atual.quem[chave] = voto;
  }

  placar[rede] = atual;
  const data = placar as unknown as Prisma.InputJsonValue;
  await prisma.sectionCache
    .upsert({
      where: { username_section: { username, section: SECAO } },
      create: { username, section: SECAO, data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);

  return { sim: atual.sim, nao: atual.nao };
}

/**
 * Escondidas e votos da pessoa, em UMA leitura.
 *
 * `redesEscondidas` e `meusVotos` liam a mesma linha do banco separadamente —
 * duas idas para o mesmo dado, e num banco remoto cada ida custa uns 300ms.
 * Esta rota é esperada pela tela de carregamento, então o tempo dela aparece.
 */
export async function votosDoPerfil(
  username: string,
  chave: string | null,
): Promise<{ escondidas: string[]; meus: Record<string, Voto> }> {
  const placar = await ler(username);
  const escondidas: string[] = [];
  const meus: Record<string, Voto> = {};

  for (const [rede, v] of Object.entries(placar)) {
    const meuVoto = chave ? v.quem?.[chave] : undefined;
    if (meuVoto) meus[rede] = meuVoto;

    if (meuVoto === "nao") {
      escondidas.push(rede);
      continue;
    }
    // Quem disse que está certa continua vendo, mesmo que outros escondam.
    if (meuVoto === "sim") continue;
    if (v.nao >= LIMITE_GLOBAL && v.nao > v.sim) escondidas.push(rede);
  }

  return { escondidas, meus };
}
