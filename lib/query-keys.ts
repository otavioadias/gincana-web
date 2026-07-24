export const queryKeys = {
  principal: ["principal"] as const,
  tenant: (organizationId: string | null, resource: string, filters?: unknown) =>
    ["tenant", organizationId ?? "platform", resource, filters ?? null] as const,
};
