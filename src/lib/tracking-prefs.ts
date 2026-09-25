/** Alert switches shown on the tracking screen, stored per tracked profile. */
export interface TrackingPrefs {
  notifications: boolean;
  newFollowing: boolean;
  unfollowed: boolean;
  postInteractions: boolean;
  stories: boolean;
}

export const DEFAULT_PREFS: TrackingPrefs = {
  notifications: true,
  newFollowing: true,
  unfollowed: true,
  postInteractions: true,
  // O Faro AI coleta stories desde 22/09 — ligado por padrão.
  stories: true,
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
    stories: bool("stories"),
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
