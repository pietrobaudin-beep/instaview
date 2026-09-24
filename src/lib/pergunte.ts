/**
 * "Pergunte ao Faro AI."
 *
 * A pessoa escreve em português — "o que mudou esta semana?", "quem parou de
 * seguir?", "teve story sobre viagem?" — e a resposta vem do que o Farejo
 * guardou sobre aquele perfil. Nada mais.
 *
 * ## A regra da casa, aqui aplicada ao pé da letra
 *
 * O modelo **não sabe nada** sobre o perfil: tudo que ele vê é o dossiê que
 * esta função monta, com data em cada linha. Se a resposta não estiver ali,
 * a instrução manda dizer que não está — e é isso que separa uma ferramenta
 * de uma máquina de achismo sobre a vida dos outros.
 *
 * Três coisas ele é proibido de fazer, e estão escritas na instrução:
 * especular intenção ("ela deve estar de mal com"), afirmar relação entre
 * pessoas, e responder o que o dossiê não contém.
 */
import { prisma } from "@/lib/db";
import { conversar } from "@/lib/ia";
import { leiturasGuardadas } from "@/lib/stories-ia";
import type { EventData } from "@/lib/faro-watch";

/** Quanto do passado entra no dossiê. Mais que isto vira custo sem resposta melhor. */
const DIAS = 30;
const MAX_PISTAS = 120;
const MAX_EVENTOS = 60;
/**
 * Teto de tamanho do que vai ao modelo (~5 mil tokens). A franquia limita
 * quantas perguntas; isto limita quanto cada uma custa.
 */
const MAX_CARACTERES = 18_000;

export interface Dossie {
  texto: string;
  /** Registros ficaram de fora — a resposta e a tela precisam dizer isso. */
  cortado: boolean;
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * O dossiê: o que o Farejo sabe deste perfil, em texto, com data.
 *
 * É o que vai para o modelo — e é também o que a tela pode mostrar a quem
 * perguntar "de onde veio isso?".
 */
export async function montarDossie(profileId: string, username: string): Promise<Dossie> {
  const desde = new Date(Date.now() - DIAS * 864e5);

  const [pistas, eventos, snaps] = await Promise.all([
    prisma.followerChange.findMany({
      where: { profileId, detectedAt: { gte: desde }, isVerified: false },
      orderBy: { detectedAt: "desc" },
      take: MAX_PISTAS,
      select: { followerUsername: true, type: true, kind: true, detectedAt: true },
    }),
    prisma.profileEvent.findMany({
      where: { profileId, detectedAt: { gte: desde }, baseline: false },
      orderBy: { detectedAt: "desc" },
      take: MAX_EVENTOS,
      select: { id: true, kind: true, data: true, detectedAt: true },
    }),
    prisma.followerSnapshot.findMany({
      where: { profileId, status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
      take: 30,
      select: { startedAt: true, bio: true, isPrivate: true, followersCount: true, followingCount: true },
    }),
  ]);

  const linhas: string[] = [`PERFIL: @${username}. Hoje é ${dia(new Date())}.`];

  if (snaps.length) {
    const a = snaps[0];
    linhas.push(
      `NÚMEROS (leitura de ${dia(a.startedAt)}): ${a.followersCount} seguidores, ${a.followingCount} seguindo, conta ${a.isPrivate ? "privada" : "pública"}.`,
    );
    // Só as mudanças de bio, não a bio repetida trinta vezes.
    let anterior: string | null | undefined;
    const mudancas: string[] = [];
    for (const s of [...snaps].reverse()) {
      if (anterior !== undefined && (s.bio ?? "") !== (anterior ?? "")) {
        mudancas.push(`${dia(s.startedAt)}: bio virou "${(s.bio ?? "").slice(0, 120)}"`);
      }
      anterior = s.bio;
    }
    if (mudancas.length) linhas.push("BIO MUDOU:\n" + mudancas.join("\n"));
  }

  const verbo = (kind: string, type: string) => {
    if (kind === "likes") return type === "FOLLOW" ? "curtiu um post de" : "tirou a curtida de um post de";
    if (kind === "comments") return type === "FOLLOW" ? "comentou num post de" : "apagou o comentário num post de";
    return type === "FOLLOW" ? "passou a seguir" : "deixou de seguir";
  };
  if (pistas.length) {
    linhas.push(
      "MUDANÇAS:\n" +
        pistas
          .map((p) => `${dia(p.detectedAt)}: @${username} ${verbo(p.kind, p.type)} @${p.followerUsername}`)
          .join("\n"),
    );
  }

  // Os stories já lidos entram com o que a IA viu neles; os posts, com a
  // legenda que o Farejo guardou (cortada em 120 caracteres na coleta).
  const lidos = await leiturasGuardadas(eventos.filter((e) => e.kind === "story").map((e) => e.id));
  if (eventos.length) {
    linhas.push(
      "PUBLICAÇÕES:\n" +
        eventos
          .map((e) => {
            const d = e.data as unknown as EventData;
            const l = lidos.get(e.id);
            const extra = l ? ` — ${l.assunto}${l.texto ? ` | texto na imagem: "${l.texto}"` : ""}` : "";
            const legenda = d?.caption ? ` — "${d.caption}"` : "";
            return `${dia(e.detectedAt)}: ${e.kind}${legenda}${extra}`;
          })
          .join("\n"),
    );
  }

  /*
   * Cortar sem dizer seria apresentar uma resposta como se tivesse olhado
   * tudo. Quando algo fica de fora, o próprio dossiê avisa — e a instrução
   * manda o modelo repetir o aviso se a pergunta depender disso.
   */
  let cortado = pistas.length >= MAX_PISTAS || eventos.length >= MAX_EVENTOS;
  let texto = linhas.join("\n\n");
  if (texto.length > MAX_CARACTERES) {
    texto = texto.slice(0, MAX_CARACTERES);
    cortado = true;
  }
  if (cortado) {
    texto +=
      "\n\nAVISO: este dossiê não contém todos os registros dos últimos 30 dias — só os mais recentes. " +
      "Se a pergunta depender de registros mais antigos, diga que eles não foram considerados.";
  }
  return { texto, cortado };
}

const INSTRUCAO = `Você é o Faro AI, do Farejo. Responde sobre UM perfil do Instagram, usando SÓ o dossiê abaixo.

Regras, sem exceção:
- Se a resposta não estiver no dossiê, diga que o Farejo não tem esse dado. Não complete com conhecimento próprio nem com suposição.
- Cite a data de cada coisa que afirmar. O dossiê tem data em toda linha.
- NUNCA especule intenção, sentimento ou motivo ("deve estar brigada com", "parece interesse amoroso"). O dossiê diz o que aconteceu, nunca por quê.
- NUNCA afirme relação entre pessoas. Seguir alguém não é ser amigo, namorar nem trabalhar junto.
- Português do Brasil, direto, no máximo 4 frases curtas. Sem saudação.`;

/** Responde a pergunta. `null` quando a IA está desligada ou não deu. */
export async function perguntar(dossie: Dossie, pergunta: string): Promise<string | null> {
  return conversar(
    [
      { role: "system", content: INSTRUCAO },
      { role: "user", content: `DOSSIÊ:\n${dossie.texto}\n\nPERGUNTA: ${pergunta.slice(0, 300)}` },
    ],
    { tarefa: "pergunta", modelo: "gpt-5.4-mini-2026-03-17", tetoMs: 25000, maxTokens: 400 },
  );
}
