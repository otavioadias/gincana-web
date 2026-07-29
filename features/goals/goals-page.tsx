"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback";
import {
  GoalCard,
  GoalForm,
  MonthlyPlanForm,
  type GoalFormValues,
} from "@/components/goals";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button, Card, PageHeading, Select } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { campaignService, goalService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import type { Goal } from "@/lib/types";
import { translateApiError } from "@/lib/api-client";

export function GoalsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const [showForm, setShowForm] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [type, setType] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);

  const goals = useQuery({
    queryKey: queryKeys.tenant(tenant, "goals"),
    queryFn: goalService.list,
  });
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(tenant, "campaigns"),
    queryFn: campaignService.list,
  });
  const create = useMutation({
    mutationFn: (values: GoalFormValues) => goalService.create(values),
    onSuccess: async () => {
      toast.success("Meta criada");
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "goals") });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível criar a meta")),
  });
  const remove = useMutation({
    mutationFn: goalService.remove,
    onSuccess: async () => {
      toast.success("Meta excluída");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "goals") });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível excluir a meta")),
  });

  const filtered = useMemo(
    () =>
      (goals.data ?? []).filter(
        (goal) =>
          (!campaignId || goal.campaignId === campaignId) &&
          (!type || goal.type === type),
      ),
    [campaignId, goals.data, type],
  );

  if (goals.isLoading || campaigns.isLoading) return <LoadingState />;
  if (goals.error || campaigns.error) {
    return (
      <ErrorState
        error={goals.error ?? campaigns.error}
        retry={() => void Promise.all([goals.refetch(), campaigns.refetch()])}
      />
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="Direção compartilhada"
        title="Metas da equipe"
        description="Defina marcos semanais e mensais e acompanhe o avanço pelo dashboard."
        action={
          <div className="heading-filters">
            <Button variant="secondary" onClick={() => setShowPlan((value) => !value)}>
              <CalendarClock size={17} /> Plano mensal
            </Button>
            <Button onClick={() => setShowForm((value) => !value)}>
              <Plus size={17} /> Nova meta
            </Button>
          </div>
        }
      />

      {showPlan ? <Card className="inline-form-card"><MonthlyPlanForm /></Card> : null}
      {showForm ? (
        <Card className="inline-form-card">
          <div className="card-heading">
            <div><p className="eyebrow">Planejamento</p><h3>Nova meta</h3></div>
          </div>
          <GoalForm
            campaigns={campaigns.data ?? []}
            loading={create.isPending}
            onCancel={() => setShowForm(false)}
            onSubmit={(values) => create.mutate(values)}
          />
        </Card>
      ) : null}

      <Card className="filter-bar">
        <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Filtrar campanha">
          <option value="">Todas as campanhas</option>
          {(campaigns.data ?? []).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
        </Select>
        <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filtrar período">
          <option value="">Todos os períodos</option>
          <option value="WEEKLY">Semanais</option>
          <option value="MONTHLY">Mensais</option>
        </Select>
      </Card>

      {filtered.length ? (
        <div className="goal-management-grid">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDelete={() => setPendingDelete(goal)} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma meta encontrada"
          description="Crie uma meta ou ajuste os filtros para visualizar outro período."
          action={<Button onClick={() => setShowForm(true)}>Criar primeira meta</Button>}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir esta meta?"
        description="Essa ação remove a meta da equipe e não pode ser desfeita."
        confirmLabel="Excluir meta"
        destructive
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
