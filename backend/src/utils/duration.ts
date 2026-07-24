const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

// Parses simple durations used in env vars ("15m", "30d") into milliseconds.
// Mirrors the subset of jsonwebtoken's `expiresIn` format we actually use.
export function parseDurationMs(input: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: "${input}" (expected e.g. "15m", "30d")`);
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}
