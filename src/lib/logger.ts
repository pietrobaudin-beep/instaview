/**
 * Tiny structured logger. Emits JSON lines so logs are grep-able locally and
 * parseable by Vercel/Datadog in production. No dependency, no config.
 */
type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function currentThreshold(): number {
  const lvl = (process.env.LOG_LEVEL as Level) || "info";
  return ORDER[lvl] ?? ORDER.info;
}

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (ORDER[level] < currentThreshold()) return;
  const line = {
    t: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  };
  const serialized = JSON.stringify(line, (_k, v) =>
    v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v,
  );
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : console.log)(serialized);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  /** Scoped child logger that prefixes every line with a component tag. */
  scope(component: string) {
    return {
      debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, { component, ...meta }),
      info: (m: string, meta?: Record<string, unknown>) => emit("info", m, { component, ...meta }),
      warn: (m: string, meta?: Record<string, unknown>) => emit("warn", m, { component, ...meta }),
      error: (m: string, meta?: Record<string, unknown>) => emit("error", m, { component, ...meta }),
    };
  },
};
