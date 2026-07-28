import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

// Vertex AI mode — authenticates via Application Default Credentials
// (gcloud auth application-default login, or an attached service account
// in production). No API key: the org's security policy disallows those.
export const gemini = new GoogleGenAI({
  vertexai: true,
  project: env.gcp.projectId,
  location: env.gcp.location,
});
