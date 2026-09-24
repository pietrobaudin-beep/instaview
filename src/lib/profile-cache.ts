/**
 * Shared cache for profile lookups.
 *
 * Every analysis starts with one of these, and several routes need the same
 * profile — so this is the single most repeated provider request in the app.
 * The copy lives in the database, not in memory: on Vercel each route runs in
 * its own instance, so an in-memory cache was being missed constantly and the
 * same @ was paid for again and again.
 *
 * A miss is cached too ("this @ does not exist"), because the provider charges
 * for 404s, and a wrong @ tends to be retried.
 */
import { prisma } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { ProviderError, type ProfileData } from "@/lib/providers/types";
import { cacheSectionKey } from "@/lib/sandbox";

const TTL = 24 * 60 * 60 * 1000;
/**
 * "Este @ não existe" vale por 1 hora, não por um dia.
 *
 * Guardar a ausência evita pagar 404 a cada tentativa de um @ digitado errado.
 * Só que um "não encontrado" pode vir de uma falha passageira — provedor fora
 * do ar, limite, ou um erro nosso. Com 24h, um tropeço de um segundo escondia
 * um perfil real pelo resto do dia. Uma hora resolve o caso do erro de
 * digitação sem sequestrar um perfil que existe.
 */
const MISSING_TTL = 60 * 60 * 1000;

/** Same row shape as the Raio-X sections, under its own key. */
const KEY = () => cacheSectionKey("profile");

type Stored = { missing: true } | { missing?: false; profile: ProfileData };

// Within one instance, skip even the database round-trip.
const memory = new Map<string, { at: number; value: Stored }>();

export interface CachedProfile {
  profile: ProfileData;
  /** When the data was actually read from the provider — shown as "última análise". */
  fetchedAt: Date;
}

function fresh(at: number, value: Stored): boolean {
  return Date.now() - at < (value.missing ? MISSING_TTL : TTL);
}

async function read(username: string): Promise<{ at: number; value: Stored } | null> {
  const local = memory.get(username);
  if (local && fresh(local.at, local.value)) return local;

  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: KEY() } } })
    .catch(() => null);
  if (!row) return null;

  const hit = { at: row.fetchedAt.getTime(), value: row.data as unknown as Stored };
  if (!fresh(hit.at, hit.value)) return null;
  memory.set(username, hit);
  return hit;
}

async function write(username: string, value: Stored): Promise<Date> {
  const data = value as unknown as Parameters<typeof prisma.sectionCache.create>[0]["data"]["data"];
  const row = await prisma.sectionCache
    .upsert({
      where: { username_section: { username, section: KEY() } },
      create: { username, section: KEY(), data },
      update: { data, fetchedAt: new Date() },
    })
    .catch(() => null);
  const at = row?.fetchedAt ?? new Date();
  memory.set(username, { at: at.getTime(), value });
  return at;
}

/** Cached profile, charging the provider only when there is nothing fresh. */
export async function getProfileCached(username: string): Promise<CachedProfile> {
  const hit = await read(username);
  if (hit) {
    if (hit.value.missing) throw new ProviderError("cached: profile not found", "NOT_FOUND");
    return { profile: hit.value.profile, fetchedAt: new Date(hit.at) };
  }

  const provider = getProvider();
  try {
    const data = provider.getProfileBasic
      ? await provider.getProfileBasic(username)
      : await provider.getProfile(username);
    const at = await write(username, { profile: data });
    return { profile: data, fetchedAt: at };
  } catch (e) {
    // Remember the miss: the provider charges for it, and people retry.
    if (e instanceof ProviderError && e.code === "NOT_FOUND") {
      await write(username, { missing: true });
    }
    throw e;
  }
}

/** The cached profile if we already have it — never triggers a request. */
export async function peekProfileCached(username: string): Promise<ProfileData | null> {
  const hit = await read(username);
  return hit && !hit.value.missing ? hit.value.profile : null;
}

/**
 * O último cartão guardado, por mais velho que seja. Para mostrar alguma coisa
 * a quem não tem mais franquia de cartão, sem pagar leitura — a tela diz a
 * data em que ele foi lido.
 */
export async function peekProfileStale(
  username: string,
): Promise<{ profile: ProfileData; fetchedAt: Date } | null> {
  const row = await prisma.sectionCache
    .findUnique({ where: { username_section: { username, section: KEY() } } })
    .catch(() => null);
  const value = row?.data as unknown as Stored | undefined;
  if (!row || !value || value.missing) return null;
  return { profile: value.profile, fetchedAt: row.fetchedAt };
}
