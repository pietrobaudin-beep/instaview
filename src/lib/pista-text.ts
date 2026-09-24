import type { Notification } from "@/components/notifications-feed";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/pista-kinds";

/**
 * Que tipo de pista é esta. Fica num lugar só porque as duas telas usam: a
 * geral (/pistas) e a do perfil (/rastros/<@>).
 */
export function describe(kind: string, type: "FOLLOW" | "UNFOLLOW"): Notification["action"] {
  if (kind === LIKES_KIND) return type === "FOLLOW" ? "curtiu_post" : "descurtiu_post";
  if (kind === COMMENTS_KIND) return type === "FOLLOW" ? "comentou" : "apagou_comentario";
  return type === "FOLLOW" ? "comecou_a_seguir" : "deixou_de_seguir";
}

/**
 * "Por que esta pista apareceu?" — e, principalmente, o que ela NÃO diz.
 *
 * Isto é texto fixo, não modelo de IA, e de propósito. A explicação é
 * mecânica: o Faro AI compara duas leituras e conta a diferença. Pedir a um
 * modelo para escrever isso seria pagar para ele parafrasear um fato — e abrir
 * a porta para ele inventar intenção, que é exatamente o que não pode
 * acontecer quando se fala de gente de verdade.
 *
 * Cada explicação tem duas partes: **como soubemos** e **o que não dá para
 * saber**. A segunda importa tanto quanto a primeira.
 */
export const EXPLICACAO: Record<Notification["action"], { como: string; limite: string }> = {
  comecou_a_seguir: {
    como: "Esta conta apareceu na lista de \u201cseguindo\u201d desta leitura e não estava na anterior.",
    limite:
      "A hora exata não existe: só sabemos que aconteceu entre as duas leituras. O Instagram não publica quando alguém começou a seguir.",
  },
  deixou_de_seguir: {
    como: "Esta conta estava na leitura anterior e sumiu desta.",
    limite:
      "Sumir da lista também acontece quando a outra conta é apagada, fica privada ou bloqueia — não é necessariamente um unfollow.",
  },
  curtiu_post: {
    como: "Esta conta apareceu entre quem curtiu o post mais recente, e não estava na leitura anterior dele.",
    limite:
      "Só o post mais recente é acompanhado. Curtida em post antigo não entra, e a ordem em que o Instagram devolve os nomes não é a ordem em que curtiram.",
  },
  descurtiu_post: {
    como: "Esta conta estava entre quem curtiu o post e não está mais.",
    limite:
      "A curtida pode ter sumido porque a pessoa a retirou, ou porque a conta dela saiu do ar ou ficou privada.",
  },
  comentou: {
    como: "Este comentário apareceu no post mais recente depois da leitura anterior.",
    limite: "O conteúdo do comentário não é guardado — só quem comentou e quando foi visto.",
  },
  apagou_comentario: {
    como: "Havia um comentário desta conta na leitura anterior e ele não está mais lá.",
    limite: "Quem apagou pode ter sido a pessoa que comentou ou o dono do perfil. Não dá para distinguir.",
  },
};
