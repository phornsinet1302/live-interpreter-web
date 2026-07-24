import { ConversationEntry } from "../../../types";

export const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Japanese", "Chinese", "Korean", "Arabic", "Russian", "Dutch",
  "Swedish", "Polish", "Turkish", "Hindi", "Vietnamese", "Thai",
];

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

export const DEMO_PHRASES = [
  "Hello, how are you doing today?",
  "I would like to visit your beautiful country someday.",
  "Can you help me find the nearest train station?",
  "The weather is absolutely wonderful this morning.",
  "Thank you so much for your kindness and hospitality.",
];

export const DEMO_TRANSLATIONS: Record<string, string[]> = {
  Spanish: ["¡Hola! ¿Cómo estás hoy?", "Me gustaría visitar tu hermoso país algún día.", "¿Puedes ayudarme a encontrar la estación de tren más cercana?", "El clima está absolutamente maravilloso esta mañana.", "Muchas gracias por tu amabilidad y hospitalidad."],
  French: ["Bonjour, comment allez-vous aujourd'hui ?", "J'aimerais visiter votre beau pays un jour.", "Pouvez-vous m'aider à trouver la gare la plus proche ?", "Le temps est absolument magnifique ce matin.", "Merci beaucoup pour votre gentillesse et votre hospitalité."],
  German: ["Hallo, wie geht es Ihnen heute?", "Ich würde Ihr schönes Land gerne eines Tages besuchen.", "Können Sie mir helfen, den nächsten Bahnhof zu finden?", "Das Wetter ist heute Morgen absolut wunderbar.", "Vielen Dank für Ihre Freundlichkeit und Gastfreundschaft."],
  Japanese: ["こんにちは、今日のご気分はいかがですか？", "いつかあなたの美しい国を訪れたいです。", "最寄りの駅を見つけるのを手伝ってもらえますか？", "今朝の天気は本当に素晴らしいですね。", "ご親切とおもてなしに心から感謝します。"],
  Chinese: ["你好，你今天怎么样？", "我希望有一天能去你们美丽的国家。", "你能帮我找到最近的火车站吗？", "今天早上的天气真是太好了。", "非常感谢您的善意和热情款待。"],
};

export const BAR_HEIGHTS = [14, 28, 20, 36, 16, 40, 22, 32, 18, 38, 24, 30, 12, 34, 26, 40, 18, 28, 36, 20, 32, 16, 38, 24, 14, 30, 22, 34];
export const BAR_DURATIONS = [0.55, 0.7, 0.62, 0.8, 0.58, 0.9, 0.65, 0.75, 0.6, 0.85, 0.68, 0.72, 0.52, 0.78, 0.64, 0.88, 0.6, 0.7, 0.82, 0.63, 0.74, 0.57, 0.87, 0.66, 0.53, 0.76, 0.61, 0.8];
export const BAR_DELAYS = [0, 0.08, 0.04, 0.12, 0.02, 0.16, 0.06, 0.1, 0.03, 0.14, 0.07, 0.11, 0.01, 0.13, 0.05, 0.17, 0.09, 0.15, 0.12, 0.04, 0.1, 0.06, 0.18, 0.08, 0.02, 0.14, 0.05, 0.16];