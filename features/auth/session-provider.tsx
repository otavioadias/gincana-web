"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/lib/services";
import { tokenStorage } from "@/lib/storage";
import { appRole, type Principal } from "@/lib/types";

interface SessionContextValue {
  principal: Principal | null;
  loading: boolean;
  login: (input: { email: string; password: string; remember: boolean }) => Promise<void>;
  registerLeader: (input: {
    name: string;
    email: string;
    password: string;
    remember: boolean;
  }) => Promise<void>;
  createTeam: (input: { teamName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function landingPath(principal: Principal) {
  const role = appRole(principal);
  if (role === "SUPER_ADMIN") return "/admin/organizations";
  if (role === "VALIDATOR") return "/validations";
  if (role === "LEADER_SETUP") return "/create-team";
  return "/dashboard";
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    if (!tokenStorage.read()) {
      queueMicrotask(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    void authService
      .me()
      .then((nextPrincipal) => {
        if (!cancelled) setPrincipal(nextPrincipal);
      })
      .catch(() => {
        tokenStorage.clear();
        if (!cancelled) setPrincipal(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string; remember: boolean }) => {
      const tokens = await authService.login({
        email: input.email,
        password: input.password,
      });
      tokenStorage.write(tokens, input.remember);
      const nextPrincipal = await authService.me();
      queryClient.clear();
      setPrincipal(nextPrincipal);
      router.replace(landingPath(nextPrincipal));
    },
    [queryClient, router],
  );

  const registerLeader = useCallback(
    async (input: { name: string; email: string; password: string; remember: boolean }) => {
      const tokens = await authService.registerLeader({
        name: input.name,
        email: input.email,
        password: input.password,
      });
      tokenStorage.write(tokens, input.remember);
      const nextPrincipal = await authService.me();
      queryClient.clear();
      setPrincipal(nextPrincipal);
      router.replace("/create-team");
    },
    [queryClient, router],
  );

  const createTeam = useCallback(
    async (input: { teamName: string }) => {
      const tokens = await authService.createTeam(input);
      tokenStorage.write(tokens);
      const nextPrincipal = await authService.me();
      queryClient.clear();
      setPrincipal(nextPrincipal);
      router.replace("/dashboard");
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    const tokens = tokenStorage.read();
    try {
      if (tokens?.refreshToken) await authService.logout(tokens.refreshToken);
    } catch {
      // A sessão local ainda deve ser encerrada se o token já tiver sido revogado.
    }
    tokenStorage.clear();
    queryClient.clear();
    setPrincipal(null);
    router.replace("/login");
  }, [queryClient, router]);

  useEffect(() => {
    if (!loading && !principal && !pathname.startsWith("/login")) {
      router.replace("/login");
    }
  }, [loading, pathname, principal, router]);

  const value = useMemo(
    () => ({ principal, loading, login, registerLeader, createTeam, logout }),
    [createTeam, loading, login, logout, principal, registerLeader],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession precisa estar dentro de SessionProvider");
  return context;
}
