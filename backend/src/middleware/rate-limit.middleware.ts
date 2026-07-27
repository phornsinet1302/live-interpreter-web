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
