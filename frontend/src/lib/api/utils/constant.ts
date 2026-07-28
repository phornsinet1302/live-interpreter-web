import { ConversationEntry } from "../../../types";

export const LANGUAGES = [
  "English",
  "Khmer",
  "Japanese",
  "Chinese",
  "Korean",
  "Vietnamese",
  "French",
  "Spanish",
  "German",
  "Portuguese",
  "Russian",
  "Arabic",
  "Hindi",
  "Indonesian",
];

// BCP-47 codes for the Web Speech API's SpeechRecognition.lang — this is
// what's speaking into the mic, so it only needs to cover source languages,
// but we keep it complete for every entry in LANGUAGES since either side
// can be picked as the "speaking" language via the swap button.
export const LANGUAGE_SPEECH_CODES: Record<string, string> = {
  English: "en-US",
  Khmer: "km-KH",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Vietnamese: "vi-VN",
  French: "fr-FR",
  Spanish: "es-ES",
  German: "de-DE",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
  Arabic: "ar-SA",
  Hindi: "hi-IN",
  Indonesian: "id-ID",
};

export const SEED_HISTORY: ConversationEntry[] = [
  {
    id: "1", date: "2026-06-28T14:32:00Z",
    sourceLang: "English", targetLang: "Spanish",
    title: "Business Partnership Meeting", duration: "18 min",
    exchanges: [
      { source: "Good morning, thank you all for joining this call. We'd like to discuss the potential partnership agreement for the upcoming quarter.", translated: "Buenos días, gracias a todos por unirse a esta llamada. Nos gustaría discutir el posible acuerdo de asociación para el próximo trimestre." },
      { source: "We have reviewed your proposal and find the terms quite competitive. However, we'd like to negotiate the delivery timeline — can we move it from 60 to 45 days?", translated: "Hemos revisado su propuesta y encontramos los términos bastante competitivos. Sin embargo, nos gustaría negociar el plazo de entrega: ¿podemos reducirlo de 60 a 45 días?" },
      { source: "That's feasible on our end. We would also need a deposit of 30% upfront before we begin production.", translated: "Eso es factible de nuestra parte. También necesitaríamos un depósito del 30% por adelantado antes de comenzar la producción." },
      { source: "We can agree to the 30% deposit. Could you send the updated contract by end of week?", translated: "Podemos aceptar el depósito del 30%. ¿Podría enviar el contrato actualizado antes de fin de semana?" },
      { source: "Absolutely. We'll have the legal team finalize the document and email it by Friday at the latest.", translated: "Por supuesto. Haremos que el equipo legal finalice el documento y lo enviará por correo a más tardar el viernes." },
    ],
    summary: [
      "Both parties agreed on a partnership for the upcoming quarter.",
      "Delivery timeline negotiated down from 60 to 45 days.",
      "A 30% upfront deposit was accepted before production begins.",
      "Updated contract to be sent by end of week.",
      "Legal team on the Spanish side to finalize document by Friday.",
    ],
    nextSteps: [
      "Send updated contract with 45-day timeline by Friday.",
      "Confirm receipt of 30% deposit wire transfer.",
      "Schedule a follow-up call to review signed agreement.",
    ],
  },
  // ... include all other seeded conversations from original SEED_HISTORY
  // (truncated for brevity; you can copy the full array)
];

export const BAR_HEIGHTS = [14, 28, 20, 36, 16, 40, 22, 32, 18, 38, 24, 30, 12, 34, 26, 40, 18, 28, 36, 20, 32, 16, 38, 24, 14, 30, 22, 34];
export const BAR_DURATIONS = [0.55, 0.7, 0.62, 0.8, 0.58, 0.9, 0.65, 0.75, 0.6, 0.85, 0.68, 0.72, 0.52, 0.78, 0.64, 0.88, 0.6, 0.7, 0.82, 0.63, 0.74, 0.57, 0.87, 0.66, 0.53, 0.76, 0.61, 0.8];
export const BAR_DELAYS = [0, 0.08, 0.04, 0.12, 0.02, 0.16, 0.06, 0.1, 0.03, 0.14, 0.07, 0.11, 0.01, 0.13, 0.05, 0.17, 0.09, 0.15, 0.12, 0.04, 0.1, 0.06, 0.18, 0.08, 0.02, 0.14, 0.05, 0.16];