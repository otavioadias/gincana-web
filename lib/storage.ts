import type { TokenPair } from "@/lib/types";

const SESSION_KEY = "gincana.session.v1";

function hasPersistentSession() {
  return typeof window !== "undefined" && Boolean(window.localStorage.getItem(SESSION_KEY));
}

export const tokenStorage = {
  read(): TokenPair | null {
    if (typeof window === "undefined") return null;
    const storage = window.sessionStorage.getItem(SESSION_KEY)
      ? window.sessionStorage
      : window.localStorage;
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TokenPair;
    } catch {
      storage.removeItem(SESSION_KEY);
      return null;
    }
  },
  isPersistent() {
    return hasPersistentSession();
  },
  write(tokens: TokenPair, persistent = hasPersistentSession()) {
    const target = persistent ? window.localStorage : window.sessionStorage;
    const other = persistent ? window.sessionStorage : window.localStorage;
    other.removeItem(SESSION_KEY);
    target.setItem(SESSION_KEY, JSON.stringify(tokens));
  },
  clear() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_KEY);
    }
  },
};
