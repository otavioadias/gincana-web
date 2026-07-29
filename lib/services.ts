import { apiRequest } from "@/lib/api-client";
import type {
  Activity,
  ActivitySummary,
  AdminTeamSummary,
  Campaign,
  DashboardSummary,
  Evidence,
  Goal,
  GoalProgress,
  Membership,
  Organization,
  Principal,
  Submission,
  TokenPair,
  TeamProfile,
  MonthlyPlanInput,
} from "@/lib/types";

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function numberOrNull(value: unknown) {
  return value === null || value === undefined ? value : Number(value);
}

function normalizeActivity(input: unknown): Activity {
  if (!input || typeof input !== "object") return {} as Activity;

  const record = input as Record<string, unknown>;
  const activity = record.activity && typeof record.activity === "object" ? (record.activity as Activity) : (record as unknown as Activity);
  const rawAvailability = record.availability && typeof record.availability === "object"
    ? (record.availability as NonNullable<Activity["availability"]>)
    : undefined;
  const availability = rawAvailability
    ? {
        ...rawAvailability,
        approvedOccurrences: Number(rawAvailability.approvedOccurrences ?? 0),
        approvedOccurrencesThisMonth: Number(rawAvailability.approvedOccurrencesThisMonth ?? 0),
        remainingOccurrences: numberOrNull(rawAvailability.remainingOccurrences) as number | null | undefined,
        remainingOccurrencesThisMonth: numberOrNull(rawAvailability.remainingOccurrencesThisMonth) as number | null | undefined,
      }
    : undefined;
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
    minimumQuantity: numberOrNull(activity.minimumQuantity),
    minimumParticipants: numberOrNull(activity.minimumParticipants),
    minimumParticipationPercent: numberOrNull(activity.minimumParticipationPercent),
    maxOccurrences: numberOrNull(activity.maxOccurrences),
    maxOccurrencesPerMonth: numberOrNull(activity.maxOccurrencesPerMonth),
    maxOccurrencesPerParticipant: numberOrNull(activity.maxOccurrencesPerParticipant),
    maxOccurrencesPerParticipantPerMonth: numberOrNull(activity.maxOccurrencesPerParticipantPerMonth),
    ...(itemTypes ? { itemTypes } : {}),
    ...(availability ? { availability } : {}),
  } as Activity;
}

function normalizeGoal(goal: Goal): Goal {
  return {
    ...goal,
    targetPoints: Number(goal.targetPoints ?? 0),
    targetActions: Number(goal.targetActions ?? 0),
    targetParticipants: Number(goal.targetParticipants ?? 0),
    targetQuantity: Number(goal.targetQuantity ?? 0),
  };
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
    return apiRequest<TokenPair>("/auth/register-manager", {
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
  get: (id: string) => apiRequest<Campaign>(`/campaigns/${id}`),
  create: (body: unknown) => apiRequest<Campaign>("/campaigns", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Campaign>(`/campaigns/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiRequest<void>(`/campaigns/${id}`, { method: "DELETE" }),
};

export const activityService = {
  list: async (campaignId?: string, actionDate?: string) =>
    normalizeActivities(
      await apiRequest<unknown>(`/activities${query({ campaignId, actionDate })}`),
    ),
  get: async (id: string) => normalizeActivity(await apiRequest<unknown>(`/activities/${id}`)),
  create: async (body: unknown) => normalizeActivity(await apiRequest<unknown>("/activities", { method: "POST", body })),
  update: async (id: string, body: unknown) =>
    normalizeActivity(await apiRequest<unknown>(`/activities/${id}`, { method: "PATCH", body })),
  availability: (id: string, actionDate: string, organizationId?: string) =>
    apiRequest<Activity["availability"]>(
      `/activities/${id}/availability${query({ actionDate, organizationId })}`,
    ),
  remove: (id: string) => apiRequest<void>(`/activities/${id}`, { method: "DELETE" }),
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
  list: (status?: string, organizationId?: string, campaignId?: string) =>
    apiRequest<Submission[]>(`/admin/submissions${query({ status, organizationId, campaignId })}`),
  get: (id: string) => apiRequest<Submission>(`/admin/submissions/${id}`),
  validate: (id: string, body: unknown) =>
    apiRequest<Submission>(`/admin/submissions/${id}/validate`, {
      method: "POST",
      body,
    }),
  approve: (id: string) =>
    apiRequest<Submission>(`/admin/submissions/${id}/approve`, { method: "POST" }),
  evidenceUrl: (submissionId: string, evidenceId: string) =>
    apiRequest<{ url: string }>(
      `/admin/submissions/${submissionId}/evidences/${evidenceId}/url`,
    ),
};

export const memberService = {
  list: () => apiRequest<Membership[]>("/members"),
  participants: (organizationId?: string) =>
    apiRequest<Membership[]>(`/members/participants${query({ organizationId })}`),
  create: (body: unknown) => apiRequest<Membership>("/members", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Membership>(`/members/${id}`, { method: "PATCH", body }),
};

export const goalService = {
  list: (campaignId?: string) =>
    apiRequest<Goal[]>(`/goals${query({ campaignId })}`).then((goals) => goals.map(normalizeGoal)),
  get: (id: string) => apiRequest<Goal>(`/goals/${id}`).then(normalizeGoal),
  create: (body: unknown) => apiRequest<Goal>("/goals", { method: "POST", body }).then(normalizeGoal),
  update: (id: string, body: unknown) =>
    apiRequest<Goal>(`/goals/${id}`, { method: "PATCH", body }).then(normalizeGoal),
  remove: (id: string) => apiRequest<void>(`/goals/${id}`, { method: "DELETE" }),
  progress: (id: string, organizationId?: string) =>
    apiRequest<GoalProgress>(`/goals/${id}/progress${query({ organizationId })}`),
  monthlyPlan: (body: MonthlyPlanInput) =>
    apiRequest<Goal[]>("/goals/monthly-plan", { method: "POST", body }).then((goals) => goals.map(normalizeGoal)),
};

export const teamSettingsService = {
  get: () => apiRequest<TeamProfile>("/team-settings"),
  updateTheme: (body: { primaryColor: string; secondaryColor: string }) =>
    apiRequest<TeamProfile>("/team-settings/theme", { method: "PATCH", body }),
  uploadLogo: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiRequest<TeamProfile>("/team-settings/logo", { method: "POST", body });
  },
  removeLogo: () =>
    apiRequest<void>("/team-settings/logo", { method: "DELETE" }),
};

export const organizationService = {
  list: () => apiRequest<Organization[]>("/admin/organizations"),
  get: (id: string) => apiRequest<Organization>(`/admin/organizations/${id}`),
  create: (body: unknown) =>
    apiRequest<Organization>("/admin/organizations", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Organization>(`/admin/organizations/${id}`, { method: "PATCH", body }),
  remove: (id: string) =>
    apiRequest<void>(`/admin/organizations/${id}`, { method: "DELETE" }),
};

export const adminDashboardService = {
  list: (campaignId?: string) =>
    apiRequest<AdminTeamSummary[]>(`/admin/dashboard/teams${query({ campaignId })}`),
  get: (organizationId: string, campaignId?: string) =>
    apiRequest<AdminTeamSummary>(
      `/admin/dashboard/teams/${organizationId}${query({ campaignId })}`,
    ),
};

export const systemService = {
  health: () => apiRequest<Record<string, unknown>>("/health", { authenticated: false }),
};
