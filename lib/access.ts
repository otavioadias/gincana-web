import type { AppRole } from "@/lib/types";

const accessRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/create-team", roles: ["LEADER_SETUP"] },
  { prefix: "/validations", roles: ["VALIDATOR"] },
  { prefix: "/members", roles: ["MANAGER"] },
  { prefix: "/campaigns", roles: ["MANAGER"] },
  { prefix: "/goals", roles: ["MANAGER"] },
  { prefix: "/settings", roles: ["MANAGER", "MEMBER"] },
  { prefix: "/dashboard", roles: ["MANAGER", "MEMBER"] },
  { prefix: "/activities", roles: ["MANAGER", "MEMBER"] },
  { prefix: "/submissions", roles: ["MANAGER", "MEMBER"] },
];

export function canAccessPath(role: AppRole, pathname: string) {
  const rule = accessRules.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`),
  );
  return rule ? rule.roles.includes(role) : false;
}
