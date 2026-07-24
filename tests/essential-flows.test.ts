import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessPath } from "@/lib/access";
import { ApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { authService, submissionService } from "@/lib/services";
import { tokenStorage } from "@/lib/storage";
import { activityAvailability } from "@/features/activities/availability";
import { estimatePoints } from "@/features/submissions/estimate";
import { validationSchema } from "@/features/validations/validation-schema";
import type { Activity, Submission } from "@/lib/types";

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("fluxos essenciais", () => {
  it("faz login com sucesso e preserva o par de tokens apenas na camada de sessão", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accessToken: "access", refreshToken: "refresh-token-with-more-than-32-chars", expiresIn: "15m" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pair = await authService.login({ email: "member@gincana.local", password: "ChangeMe123!" });
    tokenStorage.write(pair);
    expect(tokenStorage.read()?.accessToken).toBe("access");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("expõe o erro de credenciais retornado pela API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(
      authService.login({ email: "member@gincana.local", password: "senha-invalida" }),
    ).rejects.toEqual(expect.objectContaining<ApiError>({ status: 401, message: "Invalid credentials" }));
  });

  it("protege rotas conforme o perfil", () => {
    expect(canAccessPath("MEMBER", "/validations")).toBe(false);
    expect(canAccessPath("VALIDATOR", "/validations")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/admin/organizations")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/dashboard")).toBe(false);
  });

  it("mantém atividade limitada visível, mas bloqueada com motivo", () => {
    const activity = { id: "activity-1", repeatable: false, status: "ACTIVE" } as Activity;
    const submissions = [{ id: "submission-1", activityId: "activity-1", status: "APPROVED" }] as Submission[];
    expect(activityAvailability(activity, submissions)).toEqual({
      available: false,
      used: 1,
      reason: "Esta atividade pode ser registrada somente uma vez.",
    });
  });

  it("cria rascunho usando exatamente o endpoint de submissões", async () => {
    tokenStorage.write({ accessToken: "token", refreshToken: "refresh-token-with-more-than-32-chars", expiresIn: "15m" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "draft-1", status: "DRAFT" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const draft = await submissionService.create({
      campaignId: "campaign",
      activityId: "activity",
      actionDate: "2026-07-23T12:00:00.000Z",
    });
    expect(draft.status).toBe("DRAFT");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/submissions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calcula apenas a prévia PER_ITEM", () => {
    const activity = { id: "activity", scoringType: "PER_ITEM", points: 2 } as Activity;
    expect(estimatePoints(activity, { items: [{ quantity: 3 }, { quantity: 2, points: 5 }] })).toBe(16);
  });

  it("exige pontos e justificativa na aprovação parcial", () => {
    expect(validationSchema.safeParse({ status: "PARTIALLY_APPROVED" }).success).toBe(false);
    expect(
      validationSchema.safeParse({ status: "PARTIALLY_APPROVED", approvedPoints: 10, reason: "Parte da evidência foi validada." }).success,
    ).toBe(true);
  });

  it("nunca reutiliza cache entre organizações", () => {
    const queryClient = new QueryClient();
    const keyA = queryKeys.tenant("org-a", "dashboard");
    const keyB = queryKeys.tenant("org-b", "dashboard");
    queryClient.setQueryData(keyA, { approvedPoints: 100 });
    expect(queryClient.getQueryData(keyB)).toBeUndefined();
    expect(keyA).not.toEqual(keyB);
  });
});
