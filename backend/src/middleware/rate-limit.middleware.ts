import rateLimit from "express-rate-limit";

// Applied globally to /api/v1.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied only to register/login/google/forgot-password/reset-password —
// NOT /auth/refresh, which legitimate sessions call silently and often.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied to the unauthenticated quick-translate endpoint — each call is a
// billed Gemini request and there's no signed-in user to attribute abuse to,
// so this is still tighter than the global limiter. A live conversation
// fires one request per spoken sentence, which can easily be 10-15/min
// during continuous speech — a 15-minute window with a low cap meant one
// busy conversation could get locked out for the rest of the session, so
// this uses a short rolling window that recovers almost immediately
// instead of a long one that doesn't.
export const quickTranslateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
