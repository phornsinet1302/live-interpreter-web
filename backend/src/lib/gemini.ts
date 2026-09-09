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
