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

export const authService = {
  login(input: { email: string; password: string; organizationSlug?: string }) {
    return apiRequest<TokenPair>("/auth/login", {
      method: "POST",
      body: { ...input, deviceInfo: navigator.userAgent },
      authenticated: false,
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
  list: () => apiRequest<Activity[]>("/activities"),
  get: (id: string) => apiRequest<Activity>(`/activities/${id}`),
  create: (body: unknown) => apiRequest<Activity>("/activities", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Activity>(`/activities/${id}`, { method: "PATCH", body }),
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
  validate: (id: string, body: unknown) =>
    apiRequest<Submission>(`/submissions/${id}/validate`, { method: "POST", body }),
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

export const memberService = {
  list: () => apiRequest<Membership[]>("/members"),
  create: (body: unknown) => apiRequest<Membership>("/members", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Membership>(`/members/${id}`, { method: "PATCH", body }),
};

export const goalService = {
  list: () => apiRequest<Goal[]>("/goals"),
  create: (body: unknown) => apiRequest<Goal>("/goals", { method: "POST", body }),
  update: (id: string, body: unknown) =>
    apiRequest<Goal>(`/goals/${id}`, { method: "PATCH", body }),
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
