import type { AppRole } from "@/lib/types";

const accessRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/create-team", roles: ["LEADER_SETUP"] },
  { prefix: "/validations", roles: ["SUPER_ADMIN"] },
  { prefix: "/members", roles: ["MANAGER"] },
  { prefix: "/campaigns", roles: ["MANAGER", "MEMBER", "SUPER_ADMIN"] },
  { prefix: "/goals", roles: ["MANAGER", "MEMBER", "SUPER_ADMIN"] },
  { prefix: "/settings", roles: ["MANAGER", "MEMBER"] },
  { prefix: "/dashboard", roles: ["MANAGER", "MEMBER"] },
  { prefix: "/activities", roles: ["MANAGER", "MEMBER", "SUPER_ADMIN"] },
  { prefix: "/submissions", roles: ["MANAGER", "MEMBER"] },
];

export function canAccessPath(role: AppRole, pathname: string) {
  const rule = accessRules.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`),
  );
  return rule ? rule.roles.includes(role) : false;
}
