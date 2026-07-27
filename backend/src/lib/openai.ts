import OpenAI from "openai";
import { env } from "../config/env";

// Thin wrapper only — prompt construction and response parsing live in the
// module services that use this (translations, summaries, suggestions).
export const openai = new OpenAI({ apiKey: env.openaiApiKey });
