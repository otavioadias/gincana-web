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
import { activityService, campaignService, goalService } from "@/lib/services";
import type { Goal, MonthlyPlanInput } from "@/lib/types";

export function GoalsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const [showForm, setShowForm] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [type, setType] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const goals = useQuery({ queryKey: queryKeys.tenant(tenant, "goals"), queryFn: () => goalService.list() });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const activities = useQuery({ queryKey: queryKeys.tenant(tenant, "activities"), queryFn: () => activityService.list() });
  const progressQueries = useQueries({
    queries: (goals.data ?? []).map((goal) => ({
      queryKey: queryKeys.tenant(tenant, "goal-progress", goal.id),
      queryFn: () => goalService.progress(goal.id),
      enabled: Boolean(goal.id),
    })),
  });

  const refreshGoals = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "goals") }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "goal-progress") }),
  ]);
  const create = useMutation({
    mutationFn: (values: GoalFormValues) => goalService.create(values),
    onSuccess: async () => { toast.success("Meta criada"); setShowForm(false); await refreshGoals(); },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível criar a meta")),
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

  if (goals.isLoading || campaigns.isLoading || activities.isLoading) return <LoadingState />;
  if (goals.error || campaigns.error || activities.error) {
    return <ErrorState error={goals.error ?? campaigns.error ?? activities.error} retry={() => void Promise.all([goals.refetch(), campaigns.refetch(), activities.refetch()])} />;
  }

  return (
    <>
      <PageHeading
        eyebrow="Direção compartilhada"
        title="Metas da equipe"
        description="Acompanhe pontos, ações, participantes e quantidades com progresso oficial."
        action={<div className="heading-filters"><Button variant="secondary" onClick={() => setShowPlan((value) => !value)}><CalendarClock size={17} /> Plano mensal</Button><Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Nova meta</Button></div>}
      />
      {showPlan ? <Card className="inline-form-card"><MonthlyPlanForm campaigns={campaigns.data ?? []} activities={activities.data ?? []} loading={monthlyPlan.isPending} onCancel={() => setShowPlan(false)} onSubmit={(values) => monthlyPlan.mutate(values)} /></Card> : null}
      {showForm ? <Card className="inline-form-card"><div className="card-heading"><div><p className="eyebrow">Planejamento</p><h3>Nova meta</h3></div></div><GoalForm campaigns={campaigns.data ?? []} activities={activities.data ?? []} loading={create.isPending} onCancel={() => setShowForm(false)} onSubmit={(values) => create.mutate(values)} /></Card> : null}
      <Card className="filter-bar">
        <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Filtrar campanha"><option value="">Todas as campanhas</option>{(campaigns.data ?? []).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select>
        <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar tipo"><option value="">Todos os tipos</option><option value="WEEKLY">Semanais</option><option value="MONTHLY">Mensais</option><option value="CAMPAIGN">Campanha</option><option value="CUSTOM">Personalizadas</option></Select>
      </Card>
      {filtered.length ? (
        <div className="goal-management-grid">
          {filtered.map((goal) => {
            const progress = progressById.get(goal.id);
            return <GoalCard key={goal.id} goal={goal} progress={progress?.data} loading={progress?.isLoading} onDelete={() => setPendingDelete(goal)} />;
          })}
        </div>
      ) : <EmptyState title="Nenhuma meta encontrada" description="Crie uma meta ou ajuste os filtros." action={<Button onClick={() => setShowForm(true)}>Criar primeira meta</Button>} />}
      <ConfirmDialog open={Boolean(pendingDelete)} title="Excluir esta meta?" description="Essa ação não pode ser desfeita." confirmLabel="Excluir meta" destructive loading={remove.isPending} onClose={() => setPendingDelete(null)} onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)} />
    </>
  );
}
