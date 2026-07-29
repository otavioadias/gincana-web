import { apiRequest } from "@/lib/api-client";
import type {
  Activity,
  ActivitySummary,
  Campaign,
  DashboardSummary,
  Evidence,
  Goal,
  Membership,
  Organization,
  Principal,
  Submission,
  TokenPair,
} from "@/lib/types";

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function normalizeActivity(input: unknown): Activity {
  if (!input || typeof input !== "object") return {} as Activity;

  const record = input as Record<string, unknown>;
  const activity = record.activity && typeof record.activity === "object" ? (record.activity as Activity) : (record as unknown as Activity);
  const availability = record.availability && typeof record.availability === "object" ? (record.availability as Activity["availability"]) : undefined;
  const itemTypes = Array.isArray(activity.itemTypes)
    ? activity.itemTypes.map((item) => {
        const itemRecord = item as unknown as Record<string, unknown>;
        return {
          ...item,
          points: Number(itemRecord.points ?? itemRecord.pointsPerUnit ?? 0),
          pointsPerUnit: Number(itemRecord.pointsPerUnit ?? itemRecord.points ?? 0),
          minimumQuantity:
            itemRecord.minimumQuantity === null || itemRecord.minimumQuantity === undefined
              ? undefined
              : Number(itemRecord.minimumQuantity),
        };
      })
    : undefined;

  return {
    ...activity,
    points: Number(activity.points ?? 0),
    minimumQuantity:
      activity.minimumQuantity === null || activity.minimumQuantity === undefined
        ? undefined
        : Number(activity.minimumQuantity),
    minimumParticipationPercent:
      activity.minimumParticipationPercent === null ||
      activity.minimumParticipationPercent === undefined
        ? undefined
        : Number(activity.minimumParticipationPercent),
    ...(itemTypes ? { itemTypes } : {}),
    ...(availability ? { availability } : {}),
  } as Activity;
}

function normalizeActivities(payload: unknown): Activity[] {
  if (Array.isArray(payload)) return payload.map((item) => normalizeActivity(item));
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.activity && typeof record.activity === "object") return [normalizeActivity(payload)];
  }
  return [];
}

export const authService = {
  login(input: { email: string; password: string }) {
    return apiRequest<TokenPair>("/auth/login", {
      method: "POST",
      body: { ...input, deviceInfo: navigator.userAgent },
      authenticated: false,
    });
  },
  registerLeader(input: { name: string; email: string; password: string }) {
    return apiRequest<TokenPair>("/auth/register-leader", {
      method: "POST",
      body: { ...input, deviceInfo: navigator.userAgent },
      authenticated: false,
    });
  },
  createTeam(input: { teamName: string }) {
    return apiRequest<TokenPair>("/teams", {
      method: "POST",
      body: { ...input, deviceInfo: navigator.userAgent },
    });
  },
  me: () => apiRequest<Principal>("/me"),
  logout: (refreshToken: string) =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      body: { refreshToken },
      authenticated: false,
    }),
};

export const dashboardService = {
  summary: (campaignId?: string) =>
    apiRequest<DashboardSummary>(`/dashboard/summary${query({ campaignId })}`),
  byActivity: (campaignId?: string) =>
    apiRequest<ActivitySummary[]>(`/dashboard/by-activity${query({ campaignId })}`),
};

export const campaignService = {
  list: () => apiRequest<Campaign[]>("/campaigns"),
  create: (body: unknown) => apiRequest<Campaign>("/campaigns", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Campaign>(`/campaigns/${id}`, { method: "PATCH", body }),
};

export const activityService = {
  list: async (campaignId?: string) =>
    normalizeActivities(
      await apiRequest<unknown>(`/activities${query({ campaignId })}`),
    ),
  get: async (id: string) => normalizeActivity(await apiRequest<unknown>(`/activities/${id}`)),
  create: async (body: unknown) => normalizeActivity(await apiRequest<unknown>("/activities", { method: "POST", body })),
  update: async (id: string, body: unknown) =>
    normalizeActivity(await apiRequest<unknown>(`/activities/${id}`, { method: "PATCH", body })),
};

export const submissionService = {
  list: (status?: string) =>
    apiRequest<Submission[]>(`/submissions${query({ status })}`),
  get: (id: string) => apiRequest<Submission>(`/submissions/${id}`),
  create: (body: unknown) => apiRequest<Submission>("/submissions", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Submission>(`/submissions/${id}`, { method: "PATCH", body }),
  submit: (id: string) =>
    apiRequest<Submission>(`/submissions/${id}/submit`, { method: "POST" }),
  upload: (submissionId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<Evidence>(`/submissions/${submissionId}/evidences`, {
      method: "POST",
      body,
    });
  },
  evidenceUrl: (submissionId: string, evidenceId: string) =>
    apiRequest<{ url: string }>(
      `/submissions/${submissionId}/evidences/${evidenceId}/url`,
    ),
};

export const validationService = {
  list: (status?: string) =>
    apiRequest<Submission[]>(`/validation/submissions${query({ status })}`),
  get: (id: string) => apiRequest<Submission>(`/validation/submissions/${id}`),
  validate: (id: string, body: unknown) =>
    apiRequest<Submission>(`/validation/submissions/${id}/validate`, {
      method: "POST",
      body,
    }),
  evidenceUrl: (submissionId: string, evidenceId: string) =>
    apiRequest<{ url: string }>(
      `/validation/submissions/${submissionId}/evidences/${evidenceId}/url`,
    ),
};

export const memberService = {
  list: () => apiRequest<Membership[]>("/members"),
  participants: () => apiRequest<Membership[]>("/members/participants"),
  create: (body: unknown) => apiRequest<Membership>("/members", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Membership>(`/members/${id}`, { method: "PATCH", body }),
};

export const goalService = {
  list: () => apiRequest<Goal[]>("/goals"),
  get: (id: string) => apiRequest<Goal>(`/goals/${id}`),
  create: (body: unknown) => apiRequest<Goal>("/goals", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Goal>(`/goals/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiRequest<void>(`/goals/${id}`, { method: "DELETE" }),
};

export const organizationService = {
  list: () => apiRequest<Organization[]>("/admin/organizations"),
  create: (body: unknown) =>
    apiRequest<Organization>("/admin/organizations", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Organization>(`/admin/organizations/${id}`, { method: "PATCH", body }),
};

export const systemService = {
  health: () => apiRequest<Record<string, unknown>>("/health", { authenticated: false }),
};
