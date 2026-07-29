"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session-provider";
import { queryKeys } from "@/lib/query-keys";
import { teamSettingsService } from "@/lib/services";

export interface TeamBrand {
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

const DEFAULT_PRIMARY = "#0D7555";
const DEFAULT_SECONDARY = "#E9A62B";
const HEX_COLOR = /^#[0-9A-F]{6}$/i;

function normalizeHex(value: string | null | undefined, fallback: string) {
  return value && HEX_COLOR.test(value) ? value.toUpperCase() : fallback;
}

function mix(hex: string, target: "#000000" | "#FFFFFF", amount: number) {
  const source = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const destination = target === "#FFFFFF" ? 255 : 0;
  return `#${source
    .map((channel) =>
      Math.round(channel + (destination - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function teamBrandVariables(brand?: TeamBrand): React.CSSProperties {
  const primary = normalizeHex(brand?.primaryColor, DEFAULT_PRIMARY);
  const secondary = normalizeHex(brand?.secondaryColor, DEFAULT_SECONDARY);
  return {
    "--team-primary": primary,
    "--team-primary-hover": mix(primary, "#000000", 0.22),
    "--team-primary-soft": mix(primary, "#FFFFFF", 0.9),
    "--team-secondary": secondary,
    "--team-secondary-soft": mix(secondary, "#FFFFFF", 0.84),
    "--primary": primary,
    "--primary-strong": mix(primary, "#000000", 0.22),
    "--primary-soft": mix(primary, "#FFFFFF", 0.9),
    "--accent": secondary,
    "--accent-soft": mix(secondary, "#FFFFFF", 0.84),
  } as React.CSSProperties;
}

const TeamBrandContext = createContext<TeamBrand>({});

export function TeamBrandProvider({
  brand,
  children,
}: {
  brand?: TeamBrand;
  children: React.ReactNode;
}) {
  const { principal } = useSession();
  const tenant = principal?.organizationId ?? null;
  const settings = useQuery({
    queryKey: queryKeys.tenant(tenant, "team-settings"),
    queryFn: teamSettingsService.get,
    enabled: Boolean(tenant),
  });
  const value = useMemo(
    () => brand ?? settings.data ?? {},
    [brand, settings.data],
  );
  const variables = useMemo(() => teamBrandVariables(value), [value]);
  return (
    <TeamBrandContext.Provider value={value}>
      <div className="team-brand-root" style={variables}>
        {children}
      </div>
    </TeamBrandContext.Provider>
  );
}

export function useTeamBrand() {
  return useContext(TeamBrandContext);
}

export { HEX_COLOR };
