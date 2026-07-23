import { create } from "zustand";
import { ConversationEntry } from "../types";
import { SEED_HISTORY } from "../lib/api/utils/constant";

interface ConversationState {
  conversations: ConversationEntry[];
  addConversation: (conv: ConversationEntry) => void;
  deleteConversation: (id: string) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: SEED_HISTORY,
  addConversation: (conv) => set((state) => ({ conversations: [conv, ...state.conversations] })),
  deleteConversation: (id) => set((state) => ({ conversations: state.conversations.filter((c) => c.id !== id) })),
}));