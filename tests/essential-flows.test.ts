import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canAccessPath } from "@/lib/access";
import { ApiError, isPermissionError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { authService, memberService, submissionService, validationService } from "@/lib/services";
import { tokenStorage } from "@/lib/storage";
import { activityAvailability } from "@/features/activities/availability";
import { estimatePoints } from "@/features/submissions/estimate";
import {
  minimumParticipantCount,
  submissionBlockers,
} from "@/features/submissions/validation";
import { validationSchema } from "@/features/validations/validation-schema";
import { goalStatus } from "@/components/goals";
import { teamBrandVariables } from "@/components/team-brand-provider";
import type { Activity } from "@/lib/types";

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
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
    expect(window.localStorage.getItem("gincana.session.v1")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("registra o primeiro acesso de líder antes da criação da equipe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ accessToken: "access", refreshToken: "refresh-token-with-more-than-32-chars", expiresIn: "15m" }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await authService.registerLeader({
      name: "Ana",
      email: "ana@exemplo.com",
      password: "123456",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/register-leader",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Ana"'),
      }),
    );
  });

  it("mantém a sessão no localStorage somente quando solicitado", () => {
    const pair = {
      accessToken: "access",
      refreshToken: "refresh-token-with-more-than-32-chars",
      expiresIn: "15m",
    };
    tokenStorage.write(pair, true);

    expect(tokenStorage.isPersistent()).toBe(true);
    expect(tokenStorage.read()).toEqual(pair);
    expect(window.sessionStorage.getItem("gincana.session.v1")).toBeNull();
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
    ).rejects.toEqual(expect.objectContaining({ status: 401, message: "Invalid credentials" }));
  });

  it("identifica erros de permissão como 403 para o frontend", () => {
    const error = new ApiError(403, "Insufficient role for this operation");
    expect(isPermissionError(error)).toBe(true);
    expect(isPermissionError(new ApiError(500, "Internal error"))).toBe(false);
  });

  it("protege rotas conforme o perfil", () => {
    expect(canAccessPath("MEMBER", "/validations")).toBe(false);
    expect(canAccessPath("VALIDATOR", "/validations")).toBe(true);
    expect(canAccessPath("MANAGER", "/validations")).toBe(false);
    expect(canAccessPath("LEADER_SETUP", "/create-team")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/admin/organizations")).toBe(true);
    expect(canAccessPath("SUPER_ADMIN", "/dashboard")).toBe(false);
    expect(canAccessPath("MEMBER", "/settings")).toBe(true);
  });

  it("usa a disponibilidade calculada pela API como fonte oficial", () => {
    const activity = {
      id: "activity-1",
      repeatable: false,
      status: "ACTIVE",
      availability: {
        available: false,
        reason: "Maximum of 1 submitted occurrence(s) reached",
        usedOccurrences: 1,
        approvedOccurrences: 1,
      },
    } as Activity;
    expect(activityAvailability(activity)).toEqual({
      available: false,
      used: 1,
      reason: "A equipe já enviou o único registro permitido para esta atividade.",
    });
  });

  it("normaliza atividades recebidas com o envelope activity/availability", async () => {
    const fetchMock = vi.fn().mockImplementation((input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/activities")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                activity: {
                  id: "activity-1",
                  campaignId: "campaign-1",
                  name: "Doação de alimentos",
                  scoringType: "FIXED",
                  points: 100,
                  status: "ACTIVE",
                  itemTypes: [
                    {
                      id: "item-1",
                      name: "Casaco",
                      pointsPerUnit: "25",
                    },
                  ],
                },
                availability: { available: true, reason: null, usedOccurrences: 0, approvedOccurrences: 0 },
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await (await import("@/lib/services")).activityService.list();

    expect(result).toEqual([
      expect.objectContaining({
        id: "activity-1",
        campaignId: "campaign-1",
        name: "Doação de alimentos",
        availability: { available: true, reason: null, usedOccurrences: 0, approvedOccurrences: 0 },
        itemTypes: [
          expect.objectContaining({
            id: "item-1",
            points: 25,
            pointsPerUnit: 25,
          }),
        ],
      }),
    ]);
  });

  it("carrega participantes pela rota segura de memberships", async () => {
    tokenStorage.write({ accessToken: "token", refreshToken: "refresh-token-with-more-than-32-chars", expiresIn: "15m" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "membership-1",
            userId: "user-1",
            role: "MEMBER",
            status: "ACTIVE",
            user: { id: "user-1", name: "Pessoa participante", status: "ACTIVE" },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await memberService.participants();

    expect(result[0]?.id).toBe("membership-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/members/participants",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
  });

  it("carrega a fila global sem exigir organização no perfil validador", async () => {
    tokenStorage.write({ accessToken: "token", refreshToken: "refresh-token-with-more-than-32-chars", expiresIn: "15m" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "submission-1",
            status: "SUBMITTED",
            organization: { id: "team-1", name: "Equipe Esperança" },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const queue = await validationService.list("SUBMITTED");

    expect(queue[0]?.organization?.name).toBe("Equipe Esperança");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/validation/submissions?status=SUBMITTED",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
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

  it("bloqueia o envio quando quantidade e participação mínimas não são atendidas", () => {
    const activity = {
      id: "activity",
      name: "Banco de Sangue",
      status: "ACTIVE",
      minimumQuantity: 10,
      minimumParticipationPercent: 50,
    } as Activity;
    expect(minimumParticipantCount(activity, 5)).toBe(3);
    expect(
      submissionBlockers({
        activity,
        campaign: {
          id: "campaign",
          startsAt: "2026-07-01",
          endsAt: "2026-07-31",
        },
        actionDate: "2026-08-01",
        quantity: 2,
        participantCount: 0,
        activeParticipantCount: 5,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("pelo menos 10"),
        expect.stringContaining("3 participantes"),
        expect.stringContaining("Banco de Sangue"),
        expect.stringContaining("período da campanha"),
      ]),
    );
  });

  it("calcula status de meta sem inventar progresso", () => {
    expect(
      goalStatus(
        {
          id: "goal",
          startsAt: "2026-07-01",
          endsAt: "2026-07-31",
          targetPoints: 100,
          targetActions: 2,
        },
        { points: 100, actions: 2 },
        new Date("2026-07-15T12:00:00Z"),
      ),
    ).toBe("ACHIEVED");
  });

  it("gera variáveis globais de marca com variações derivadas", () => {
    const variables = teamBrandVariables({
      primaryColor: "#123456",
      secondaryColor: "#ABCDEF",
    }) as Record<string, string>;
    expect(variables["--team-primary"]).toBe("#123456");
    expect(variables["--primary"]).toBe("#123456");
    expect(variables["--team-primary-hover"]).toMatch(/^#[0-9a-f]{6}$/i);
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
