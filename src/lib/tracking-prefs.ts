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
  // Stories are not exposed by any provider we use — off and disabled.
  stories: false,
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
    stories: false,
  };
}
