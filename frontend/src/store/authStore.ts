import { create } from "zustand";
import { UserAccount } from "../types";

interface AuthState {
  user: UserAccount | null;
  login: (user: UserAccount) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));