// Minimal structured logger. Swap for pino/winston later if needed — every
// call site already goes through this module, so that'd be a one-file change.
type LogMeta = Record<string, unknown>;

function log(level: "info" | "warn" | "error", message: string, meta?: LogMeta) {
  const entry = { level, time: new Date().toISOString(), message, ...meta };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => log("info", message, meta),
  warn: (message: string, meta?: LogMeta) => log("warn", message, meta),
  error: (message: string, meta?: LogMeta) => log("error", message, meta),
};
