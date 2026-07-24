import type { TokenPair } from "@/lib/types";

const SESSION_KEY = "gincana.session.v1";

export const tokenStorage = {
  read(): TokenPair | null {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  },
  write(tokens: TokenPair) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
  },
  clear() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  },
};
