import { env } from "../../config/env";
import { parseDurationMs } from "../../utils/duration";

export const REFRESH_TOKEN_TTL_MS = parseDurationMs(env.jwt.refreshExpiry);
