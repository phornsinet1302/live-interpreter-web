import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

// Use Google AI API key if available, otherwise fall back to Vertex AI mode
// with Application Default Credentials.
let _gemini: GoogleGenAI | null = null;

function initializeGemini(): GoogleGenAI {
  if (_gemini) return _gemini;
  
  try {
    // Prefer Google API key (Google AI) over Vertex AI with ADC
    if (env.googleApiKey) {
      _gemini = new GoogleGenAI({
        apiKey: env.googleApiKey,
      });
      console.log("✅ Gemini initialized with Google AI API key");
      return _gemini;
    }
    
    // Fall back to Vertex AI mode (requires GCP_PROJECT_ID + Application Default Credentials)
    _gemini = new GoogleGenAI({
      vertexai: true,
      project: env.gcp.projectId || (env.isProduction ? undefined : "mock-project-dev"),
      location: env.gcp.location,
    });
    console.log("✅ Gemini initialized with Vertex AI (GCP credentials)");
    return _gemini;
  } catch (error) {
    if (env.isProduction) {
      throw new Error(
        `Failed to initialize Gemini: ${error instanceof Error ? error.message : String(error)}. ` +
        "Ensure either GOOGLE_API_KEY or GCP_PROJECT_ID + Application Default Credentials are configured."
      );
    }
    // In dev mode, log warning and continue
    console.warn(
      "⚠️  Gemini initialization failed (dev mode). " +
      "To enable Gemini API: set GOOGLE_API_KEY or (GCP_PROJECT_ID + gcloud auth application-default login)"
    );
    throw error;
  }
}

// The free tier's generate_content_free_tier_requests quota (15 req/min for
// gemini-3.5-flash-lite, shared across translate/transcribe/lookup on this
// project) means a burst of real usage — the live tab-audio interpreter
// alone can fire a request every couple seconds — routinely 429s. Google's
// error body includes a RetryInfo.retryDelay hint for exactly this case;
// one retry after that delay turns a transient over-quota moment into a
// few seconds of extra latency instead of a hard failure, without needing
// to move off the free tier.
const DEFAULT_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 20000;

function extractRetryDelayMs(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  const status = (error as { status?: number }).status;
  if (status !== 429) return null;
  try {
    const parsed = JSON.parse(error.message) as {
      error?: { details?: Array<{ "@type"?: string; retryDelay?: string }> };
    };
    const retryInfo = parsed.error?.details?.find((d) => d["@type"]?.endsWith("RetryInfo"));
    const seconds = retryInfo?.retryDelay ? Number(retryInfo.retryDelay.replace(/s$/, "")) : null;
    if (seconds && Number.isFinite(seconds)) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
  } catch {
    // Message wasn't the expected JSON shape — fall through to the default.
  }
  return DEFAULT_RETRY_DELAY_MS;
}

// Retries once on a 429 (RESOURCE_EXHAUSTED), waiting for Google's suggested
// retryDelay first. Any other error, or a second failure, propagates as-is —
// callers keep their existing catch/log/502 handling unchanged.
export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const delayMs = extractRetryDelayMs(error);
    if (delayMs === null) throw error;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  }
}

// Lazy initialization: Try to initialize on first access
export const gemini = (() => {
  try {
    return initializeGemini();
  } catch (error) {
    if (env.isProduction) throw error;
    // In dev, return a proxy that will throw only if actually used
    return new Proxy({} as GoogleGenAI, {
      get: (target, prop) => {
        throw new Error(
          `Gemini not initialized. Set GOOGLE_API_KEY or configure GCP credentials to enable translations.`
        );
      },
    }) as GoogleGenAI;
  }
})();
