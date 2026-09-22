import OpenAI from "openai";
import { env } from "../config/env";

// Thin wrapper only — prompt construction and response parsing live in the
// module services that use this (translations, summaries, suggestions).
//
// Lazy, like lib/gemini.ts's pattern — the OpenAI SDK's constructor throws
// synchronously if apiKey is missing/empty, and this module used to
// construct it eagerly at import time. Since summaries.service.ts imports
// this at the top level, that crashed the *entire* server on boot whenever
// OPENAI_API_KEY wasn't set — not just the summaries/suggestions endpoints
// that actually need it.
let _openai: OpenAI | null = null;

function initializeOpenAI(): OpenAI {
  if (_openai) return _openai;
  if (!env.openaiApiKey) {
    throw new Error(
      "OpenAI not initialized. Set OPENAI_API_KEY to enable summaries/suggestions."
    );
  }
  _openai = new OpenAI({ apiKey: env.openaiApiKey });
  return _openai;
}

export const openai = new Proxy({} as OpenAI, {
  get: (_target, prop) => {
    const client = initializeOpenAI();
    return client[prop as keyof OpenAI];
  },
});
