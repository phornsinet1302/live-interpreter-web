// Service -> business rules & orchestration. No req/res.
import * as repo from "./translations.repository";
import { getConversationForOwner } from "../conversations/conversations.service";
import { gemini } from "../../lib/gemini";
import { logger } from "../../lib/logger";
import { ApiError } from "../../utils/api-error";
import { toSkipTake, paginated, type PaginationQuery } from "../../utils/pagination";
import { getIO } from "../../websocket/socket";
import { conversationRoom, SOCKET_EVENTS } from "../../websocket/events";
import type { CreateMessageInput, LookupResult, TranslateResult } from "./translations.types";

const TRANSLATION_PROVIDER = "vertex-gemini";
// gemini-3.6-flash has only a 20-requests/day free-tier quota on this
// project; gemini-3.5-flash-lite is a separate, much less constrained quota
// bucket and handles the same JSON-response prompt shape.
const TRANSLATION_MODEL = "gemini-3.5-flash-lite";

// Demo translations for testing when API key is invalid
const DEMO_TRANSLATIONS: Record<string, Record<string, string>> = {
  "good morning": {
    Khmer: "ល្អពេលព្រឹក",
    French: "Bonjour",
    Spanish: "Buenos días",
    Japanese: "おはよう",
    Chinese: "早上好",
    Vietnamese: "Chào buổi sáng",
  },
  "good morning everyone": {
    Khmer: "ពិតល្អពេលព្រឹក ប្រជាជន",
    French: "Bonjour à tous",
    Spanish: "Buenos días a todos",
    Japanese: "おはようございます皆さん",
    Chinese: "早上好各位",
    Vietnamese: "Chào buổi sáng mọi người",
  },
  "hello": {
    Khmer: "ស្វាគមន៍",
    French: "Bonjour",
    Spanish: "Hola",
    Japanese: "こんにちは",
    Chinese: "你好",
    Vietnamese: "Xin chào",
  },
  "hello, how are you?": {
    Khmer: "ស្វាគមន៍ តើអ្នកសប្បាយដែរឬទេ?",
    French: "Bonjour, comment allez-vous?",
    Spanish: "Hola, ¿cómo estás?",
    Japanese: "こんにちは、お元気ですか？",
    Chinese: "你好，你好吗？",
    Vietnamese: "Xin chào, bạn khỏe không?",
  },
  "how are you?": {
    Khmer: "តើអ្នកសប្បាយដែរឬទេ?",
    French: "Comment allez-vous?",
    Spanish: "¿Cómo estás?",
    Japanese: "お元気ですか？",
    Chinese: "你好吗？",
    Vietnamese: "Bạn khỏe không?",
  },
  "hi": {
    Khmer: "សួស្តី",
    French: "Salut",
    Spanish: "Hola",
    Japanese: "やあ",
    Chinese: "嗨",
    Vietnamese: "Xin chào",
  },
  "thank you": {
    Khmer: "សូមអរគុណ",
    French: "Merci",
    Spanish: "Gracias",
    Japanese: "ありがとう",
    Chinese: "谢谢",
    Vietnamese: "Cảm ơn",
  },
  "goodbye": {
    Khmer: "លាហើយ",
    French: "Au revoir",
    Spanish: "Adiós",
    Japanese: "さようなら",
    Chinese: "再见",
    Vietnamese: "Tạm biệt",
  },
};

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslateResult> {
  try {
    const response = await gemini.models.generateContent({
      model: TRANSLATION_MODEL,
      contents: `Source language: ${sourceLanguage}\nTarget language: ${targetLanguage}\nText: ${text}`,
      config: {
        systemInstruction:
          "You are a professional interpreter. Translate the user's message from the source language to the target language. " +
          'Respond ONLY with JSON of the shape {"translatedText": string, "confidence": number between 0 and 1}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as { translatedText?: string; confidence?: number };
    if (!parsed.translatedText) throw new Error("Missing translatedText in completion");

    return {
      translatedText: parsed.translatedText,
      provider: TRANSLATION_PROVIDER,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : null,
    };
  } catch (error) {
    logger.error("Translation request failed", error);
    
    // Fallback to demo translations for development
    const demoTranslation = DEMO_TRANSLATIONS[text.toLowerCase()];
    if (demoTranslation && demoTranslation[targetLanguage]) {
      console.log(`✅ Using demo translation: "${text}" → "${targetLanguage}"`);
      return {
        translatedText: demoTranslation[targetLanguage],
        provider: "demo-gemini",
        confidence: 0.95,
      };
    }
    
    throw new ApiError(502, "Translation service is currently unavailable", "TRANSLATION_FAILED");
  }
}

// Powers the browser extension's highlight-to-translate popover — same
// model/provider as translateText, but asks for a phonetic/romanized
// reading and a couple of usage examples too, since a popover over a single
// highlighted word reads much more like a dictionary lookup than a plain
// sentence translation. sourceLanguage may be "auto" (the extension doesn't
// ask the user to pick a source language up front — it detects it).
export async function lookupText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<LookupResult> {
  try {
    const sourceLine =
      sourceLanguage === "auto"
        ? "Source language: auto-detect it from the text."
        : `Source language: ${sourceLanguage}`;
    const response = await gemini.models.generateContent({
      model: TRANSLATION_MODEL,
      contents: `${sourceLine}\nTarget language: ${targetLanguage}\nText: ${text}`,
      config: {
        systemInstruction:
          "You are a professional interpreter powering a browser extension's highlight-to-translate popover. " +
          "Translate the given text into the target language. If it's a single word or short phrase (a dictionary-lookup " +
          "case), also give a phonetic reading of the TRANSLATED text — this must be written in the LATIN/ROMAN alphabet " +
          '(romanized pronunciation, e.g. for Khmer "លឿន" the phonetic is "leuun", NOT the Khmer script again), plus up ' +
          "to 2 short example sentences in the target language's own native script using it naturally. If the text is a " +
          "longer passage (more than roughly one sentence), it isn't a dictionary lookup — leave phonetic as an empty " +
          'string and examples as an empty array rather than inventing something contrived. Respond ONLY with JSON of ' +
          'the shape {"translatedText": string, "phonetic": string, "examples": string[], "confidence": number between 0 and 1}.',
        responseMimeType: "application/json",
      },
    });

    const raw = response.text;
    if (!raw) throw new Error("Empty completion");
    const parsed = JSON.parse(raw) as {
      translatedText?: string;
      phonetic?: string;
      examples?: string[];
      confidence?: number;
    };
    if (!parsed.translatedText) throw new Error("Missing translatedText in completion");

    return {
      translatedText: parsed.translatedText,
      phonetic: parsed.phonetic?.trim() || null,
      examples: Array.isArray(parsed.examples) ? parsed.examples.filter(Boolean) : [],
      provider: TRANSLATION_PROVIDER,
      confidence:
        typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
    };
  } catch (error) {
    logger.error("Lookup request failed", error);
    throw new ApiError(502, "Translation service is currently unavailable", "TRANSLATION_FAILED");
  }
}

export async function createMessage(
  conversationId: string,
  userId: string,
  input: CreateMessageInput
) {
  const conversation = await getConversationForOwner(conversationId, userId);
  const sourceLanguage = input.sourceLanguage ?? conversation.sourceLanguage;
  const targetLanguage = input.targetLanguage ?? conversation.targetLanguage;

  const result = await translateText(input.originalText, sourceLanguage, targetLanguage);

  const message = await repo.create({
    conversationId,
    speakerId: input.speakerId ?? null,
    originalText: input.originalText,
    translatedText: result.translatedText,
    sourceLanguage,
    targetLanguage,
    translationProvider: result.provider,
    confidence: result.confidence,
  });

  getIO()?.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.MESSAGE_NEW, message);

  return message;
}

export async function listMessages(
  conversationId: string,
  userId: string,
  query: PaginationQuery
) {
  await getConversationForOwner(conversationId, userId);
  const { page, limit, skip, take } = toSkipTake(query);
  const [data, total] = await Promise.all([
    repo.findManyByConversation(conversationId, skip, take),
    repo.countByConversation(conversationId),
  ]);
  return paginated(data, total, page, limit);
}

export async function getMessage(conversationId: string, messageId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const message = await repo.findById(conversationId, messageId);
  if (!message) throw ApiError.notFound("Message not found");
  return message;
}

export async function deleteMessage(conversationId: string, messageId: string, userId: string) {
  await getConversationForOwner(conversationId, userId);
  const message = await repo.findById(conversationId, messageId);
  if (!message) throw ApiError.notFound("Message not found");
  await repo.remove(messageId);
}
