import { Heart, ImageIcon, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/brand";
import type { CurtidasNoPrimeiro } from "@/lib/analise";

// O CDN do Instagram bloqueia imagem embutida; passa pelo proxy.
const viaProxy = (u: string) =>
  /(?:\.fbcdn\.net|\.cdninstagram\.com)/i.test(u) ? `/api/img?url=${encodeURIComponent(u)}` : u;

/**
 * "O que @x curtiu de @y": os posts mais recentes da conta com quem a pessoa
 * mais interage, cada um dizendo se ela curtiu ou comentou.
 *
 * "Não apareceu" não é "não curtiu": em post grande o Instagram entrega só
 * parte de quem curtiu.
 */
export function CurtidasNoPrimeiroPanel({ username, dados }: { username: string; dados: CurtidasNoPrimeiro }) {
  const { alvo, posts } = dados;
  const achou = posts.filter((p) => p.curtiu || p.comentou).length;
  return (
    <Panel
      title={
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={alvo.avatarUrl} name={alvo.displayName ?? alvo.username} size={40} />
          <div className="min-w-0 text-left">
            <h2 className="truncate text-base font-bold tracking-tight">❤️ O que @{username} curtiu</h2>
            <p className="truncate text-xs text-muted-foreground">
              nos posts de{" "}
              <a
                href={`https://instagram.com/${alvo.username}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground hover:underline"
              >
                @{alvo.username}
              </a>
              , com quem mais interage
            </p>
          </div>
        </div>
      }
    >
      <div className="grid max-w-md grid-cols-3 gap-2">
        {posts.map((p) => {
          const link = p.code ? `https://instagram.com/p/${p.code}` : `https://instagram.com/${alvo.username}`;
          return (
            <a
              key={p.id}
              href={link}
              target="_blank"
              rel="noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted"
            >
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viaProxy(p.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </span>
              )}
              <span className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap justify-center gap-1">
                {p.curtiu && (
                  <span className="flex items-center gap-1 rounded-full bg-pink px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    <Heart className="h-3 w-3 fill-white" /> Curtiu
                  </span>
                )}
                {p.comentou && (
                  <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    <MessageCircle className="h-3 w-3 fill-white" /> Comentou
                  </span>
                )}
                {!p.curtiu && !p.comentou && (
                  <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                    Não apareceu
                  </span>
                )}
              </span>
            </a>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-semibold">
        {achou === 0
          ? `Não apareceu nos ${posts.length} posts mais recentes.`
          : `Apareceu em ${achou} de ${posts.length} posts mais recentes.`}
      </p>
    </Panel>
  );
}
