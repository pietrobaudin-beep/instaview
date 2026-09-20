import type { Notification } from "@/components/notifications-feed";
import { COMMENTS_KIND, LIKES_KIND } from "@/lib/post-activity";

/**
 * Que tipo de pista é esta. Fica num lugar só porque as duas telas usam: a
 * geral (/pistas) e a do perfil (/rastros/<@>).
 */
export function describe(kind: string, type: "FOLLOW" | "UNFOLLOW"): Notification["action"] {
  if (kind === LIKES_KIND) return type === "FOLLOW" ? "curtiu_post" : "descurtiu_post";
  if (kind === COMMENTS_KIND) return type === "FOLLOW" ? "comentou" : "apagou_comentario";
  return type === "FOLLOW" ? "comecou_a_seguir" : "deixou_de_seguir";
}
