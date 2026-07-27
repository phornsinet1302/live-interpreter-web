export interface CreateConversationInput {
  title?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface UpdateConversationInput {
  title?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export type ConversationTransition = "start" | "pause" | "resume" | "end";
