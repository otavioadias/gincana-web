export const queryKeys = {
  principal: ["principal"] as const,
  tenantResource: (organizationId: string | null, resource: string) =>
    ["tenant", organizationId ?? "platform", resource] as const,
  tenant: (organizationId: string | null, resource: string, filters?: unknown) =>
    ["tenant", organizationId ?? "platform", resource, filters ?? null] as const,
};
