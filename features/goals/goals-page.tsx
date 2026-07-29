"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback";
import { GoalCard, GoalForm, MonthlyPlanForm, type GoalFormValues } from "@/components/goals";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button, Card, PageHeading, Select } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { activityService, campaignService, goalService, organizationService } from "@/lib/services";
import { appRole, type Goal, type MonthlyPlanInput } from "@/lib/types";

export function GoalsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const role = appRole(principal);
  const canManage = role === "SUPER_ADMIN";
  const [showForm, setShowForm] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [type, setType] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const goals = useQuery({ queryKey: queryKeys.tenant(tenant, "goals"), queryFn: () => goalService.list() });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const activities = useQuery({ queryKey: queryKeys.tenant(tenant, "activities"), queryFn: () => activityService.list() });
  const organizations = useQuery({
    queryKey: queryKeys.tenant(null, "organizations"),
    queryFn: organizationService.list,
    enabled: canManage,
  });
  const progressQueries = useQueries({
    queries: (goals.data ?? []).map((goal) => ({
      queryKey: queryKeys.tenant(tenant, "goal-progress", {
        goalId: goal.id,
        organizationId: canManage ? organizationId : undefined,
      }),
      queryFn: () => goalService.progress(goal.id, canManage ? organizationId : undefined),
      enabled: Boolean(goal.id) && (!canManage || Boolean(organizationId)),
    })),
  });

  const refreshGoals = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "goals") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "goal-progress") }),
  ]);
  const save = useMutation({
    mutationFn: (values: GoalFormValues) => editingGoal
      ? goalService.update(editingGoal.id, values)
      : goalService.create(values),
    onSuccess: async () => {
      toast.success(editingGoal ? "Meta atualizada" : "Meta criada");
      setEditingGoal(null);
      setShowForm(false);
      await refreshGoals();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível salvar a meta")),
  });
  const monthlyPlan = useMutation({
    mutationFn: (values: MonthlyPlanInput) => goalService.monthlyPlan(values),
    onSuccess: async (created) => {
      toast.success(`${created.length} meta${created.length === 1 ? "" : "s"} criada${created.length === 1 ? "" : "s"}`);
      setShowPlan(false);
      await refreshGoals();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível gerar o plano mensal")),
  });
  const remove = useMutation({
    mutationFn: goalService.remove,
    onSuccess: async () => { toast.success("Meta excluída"); setPendingDelete(null); await refreshGoals(); },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível excluir a meta")),
  });

  const progressById = useMemo(
    () => new Map((goals.data ?? []).map((goal, index) => [goal.id, progressQueries[index]])),
    [goals.data, progressQueries],
  );
  const filtered = useMemo(
    () => (goals.data ?? []).filter((goal) => (!campaignId || goal.campaignId === campaignId) && (!type || goal.type === type)),
    [campaignId, goals.data, type],
  );

  if (goals.isLoading || campaigns.isLoading || activities.isLoading || (canManage && organizations.isLoading)) return <LoadingState />;
  if (goals.error || campaigns.error || activities.error || organizations.error) {
    return <ErrorState error={goals.error ?? campaigns.error ?? activities.error ?? organizations.error} retry={() => void Promise.all([goals.refetch(), campaigns.refetch(), activities.refetch(), organizations.refetch()])} />;
  }

  return (
    <>
      <PageHeading
        eyebrow={canManage ? "Administração global" : "Direção compartilhada"}
        title={canManage ? "Metas globais" : "Metas da equipe"}
        description={canManage
          ? "Crie metas globais e selecione uma equipe para consultar o progresso oficial."
          : "Acompanhe pontos, ações, participantes e quantidades com progresso oficial."}
        action={canManage ? <div className="heading-filters"><Button variant="secondary" onClick={() => setShowPlan((value) => !value)}><CalendarClock size={17} /> Plano mensal</Button><Button onClick={() => {
          setEditingGoal(null);
          setShowForm((value) => !value);
        }}><Plus size={17} /> Nova meta</Button></div> : undefined}
      />
      {showPlan && canManage ? <Card className="inline-form-card"><MonthlyPlanForm campaigns={campaigns.data ?? []} activities={activities.data ?? []} loading={monthlyPlan.isPending} onCancel={() => setShowPlan(false)} onSubmit={(values) => monthlyPlan.mutate(values)} /></Card> : null}
      {showForm && canManage ? <Card className="inline-form-card"><div className="card-heading"><div><p className="eyebrow">Planejamento</p><h3>{editingGoal ? "Editar meta" : "Nova meta"}</h3></div></div><GoalForm campaigns={campaigns.data ?? []} activities={activities.data ?? []} initialValues={editingGoal} loading={save.isPending} onCancel={() => {
        setEditingGoal(null);
        setShowForm(false);
      }} onSubmit={(values) => save.mutate(values)} /></Card> : null}
      <Card className="filter-bar">
        {canManage ? (
          <Select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} aria-label="Selecionar equipe para o progresso">
            <option value="">Selecione uma equipe para ver o progresso</option>
            {(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </Select>
        ) : null}
        <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Filtrar campanha"><option value="">Todas as campanhas</option>{(campaigns.data ?? []).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select>
        <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar tipo"><option value="">Todos os tipos</option><option value="WEEKLY">Semanais</option><option value="MONTHLY">Mensais</option><option value="CAMPAIGN">Campanha</option><option value="CUSTOM">Personalizadas</option></Select>
      </Card>
      {filtered.length ? (
        <div className="goal-management-grid">
          {filtered.map((goal) => {
            const progress = progressById.get(goal.id);
            return <GoalCard
              key={goal.id}
              goal={goal}
              progress={progress?.data}
              loading={progress?.isLoading}
              onEdit={canManage ? () => {
                setEditingGoal(goal);
                setShowForm(true);
              } : undefined}
              onDelete={canManage ? () => setPendingDelete(goal) : undefined}
            />;
          })}
        </div>
      ) : <EmptyState title="Nenhuma meta encontrada" description="Crie uma meta ou ajuste os filtros." action={canManage ? <Button onClick={() => setShowForm(true)}>Criar primeira meta</Button> : undefined} />}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir esta meta?" description="Essa ação não pode ser desfeita." confirmLabel="Excluir meta" destructive loading={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)} />
    </>
  );
}
