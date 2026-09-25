/** Alert switches shown on the tracking screen, stored per tracked profile. */
export interface TrackingPrefs {
  notifications: boolean;
  newFollowing: boolean;
  unfollowed: boolean;
  postInteractions: boolean;
  stories: boolean;
  /** O que aparece no painel do perfil (só tela; não muda a coleta). */
  verVisita: boolean;
  verSemana: boolean;
  verStories: boolean;
  verQuem: boolean;
  verNovidades: boolean;
  verGrafico: boolean;
}

export const DEFAULT_PREFS: TrackingPrefs = {
  notifications: true,
  newFollowing: true,
  unfollowed: true,
  postInteractions: true,
  // O Faro AI coleta stories desde 22/09 — ligado por padrão.
  stories: true,
  verVisita: true,
  verSemana: true,
  verStories: true,
  verQuem: true,
  verNovidades: true,
  verGrafico: true,
};

/** Coerce whatever is in the JSON column into a complete, safe prefs object. */
export function readPrefs(raw: unknown): TrackingPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  const v = raw as Record<string, unknown>;
  const bool = (k: keyof TrackingPrefs) =>
    typeof v[k] === "boolean" ? (v[k] as boolean) : DEFAULT_PREFS[k];
  return {
    notifications: bool("notifications"),
    newFollowing: bool("newFollowing"),
    unfollowed: bool("unfollowed"),
    postInteractions: bool("postInteractions"),
    // Lido de `guardarStories`, não de `stories`: até 24/09 o código gravava
    // `stories: false` à força em toda configuração salva — não era escolha
    // de ninguém, e relê-lo pararia a coleta de stories desses perfis.
    stories: typeof v.guardarStories === "boolean" ? v.guardarStories : DEFAULT_PREFS.stories,
    verVisita: bool("verVisita"),
    verSemana: bool("verSemana"),
    verStories: bool("verStories"),
    verQuem: bool("verQuem"),
    verNovidades: bool("verNovidades"),
    verGrafico: bool("verGrafico"),
  };
}

/**
 * Quais tipos de mudança de "seguindo" a pessoa quer ver deste perfil.
 * FOLLOW = começou a seguir; UNFOLLOW = deixou de seguir.
 */
export function tiposVisiveis(prefs: TrackingPrefs): ("FOLLOW" | "UNFOLLOW")[] {
  const t: ("FOLLOW" | "UNFOLLOW")[] = [];
  if (prefs.newFollowing) t.push("FOLLOW");
  if (prefs.unfollowed) t.push("UNFOLLOW");
  return t;
}

/** O que vai para o banco: `stories` gravado como `guardarStories`. */
export function paraGravar(prefs: TrackingPrefs) {
  const { stories, ...resto } = prefs;
  return { ...resto, guardarStories: stories };
}
