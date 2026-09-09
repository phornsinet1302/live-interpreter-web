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

// Applied to the unauthenticated quick-transcribe endpoint. Same short
// rolling window as quick-translate, for the same reason — one busy Khmer
// conversation can fire a transcribe call per utterance, easily 10-15/min.
export const quickTranscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied to the unauthenticated quick-next-step endpoint (the live
// mid-session nudge). The frontend's own dedup logic — only calling this when
// the transcript has grown since the last suggestion — is the real throttle;
// this is mostly a safety net against abuse, so a short rolling window with a
// modest cap is enough.
export const quickNextStepLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied to the unauthenticated quick-summarize endpoint. Unlike
// quick-translate, this fires once per finished conversation, not once per
// sentence, so a much lower cap is plenty — kept as a 15-minute window
// since there's no mid-conversation retry loop depending on fast recovery.
export const quickSummaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});
