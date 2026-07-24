import type { AppRole } from "@/lib/types";

const accessRules: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/validations", roles: ["MANAGER", "VALIDATOR"] },
  { prefix: "/members", roles: ["MANAGER"] },
  { prefix: "/campaigns", roles: ["MANAGER"] },
  { prefix: "/goals", roles: ["MANAGER"] },
  { prefix: "/settings", roles: ["MANAGER"] },
  { prefix: "/dashboard", roles: ["MANAGER", "VALIDATOR", "MEMBER"] },
  { prefix: "/activities", roles: ["MANAGER", "VALIDATOR", "MEMBER"] },
  { prefix: "/submissions", roles: ["MANAGER", "VALIDATOR", "MEMBER"] },
];

export function canAccessPath(role: AppRole, pathname: string) {
  const rule = accessRules.find(
    (candidate) => pathname === candidate.prefix || pathname.startsWith(`${candidate.prefix}/`),
  );
  return rule ? rule.roles.includes(role) : false;
}
