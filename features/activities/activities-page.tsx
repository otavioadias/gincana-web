"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Filter, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading, Select } from "@/components/ui";
import {
  ActivityAvailabilityBadge,
  ActivityAvailabilityDetails,
  ActivityLimitForm,
  ActivityLimitSummary,
} from "@/components/activity-limits";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { ConfirmDialog } from "@/components/feedback";
import { useSession } from "@/features/auth/session-provider";
import { activityAvailability } from "@/features/activities/availability";
import { activityService, campaignService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { appRole, type ScoringType } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import type { Activity } from "@/lib/types";
import { translateApiError } from "@/lib/api-client";

const scoringLabels: Record<ScoringType, string> = {
  FIXED: "Pontos fixos",
  PER_ITEM: "Por item",
  PER_KG: "Por quilo",
  PER_MEMBER: "Por participante",
  PER_COMPLETE_KIT: "Por kit completo",
  TIERED: "Por faixa",
  MANUAL: "Definição manual",
};

const createSchema = z.object({
  campaignId: z.string().min(1, "Selecione uma campanha"),
  name: z.string().min(3, "Informe um nome"),
  description: z.string().optional(),
  scoringType: z.enum(["FIXED", "PER_ITEM", "PER_KG", "PER_MEMBER", "PER_COMPLETE_KIT", "TIERED", "MANUAL"]),
  points: z.coerce.number().min(0),
  unit: z.string().optional(),
  maxOccurrences: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(1).optional(),
  ),
  maxOccurrencesPerMonth: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(1).optional()),
  maxOccurrencesPerParticipant: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(1).optional()),
  maxOccurrencesPerParticipantPerMonth: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(1).optional()),
  minimumParticipants: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(1).optional()),
  minimumQuantity: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(0).optional(),
  ),
  minimumParticipationPercent: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(0).max(100).optional(),
  ),
  evidenceRequired: z.boolean(),
  repeatable: z.boolean(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  itemTypes: z.array(z.object({
    name: z.string().min(1, "Informe o item"),
    pointsPerUnit: z.coerce.number().min(0),
    unit: z.string().min(1, "Informe a unidade"),
    minimumQuantity: z.preprocess(
      (value) => value === "" ? undefined : value,
      z.coerce.number().min(0).optional(),
    ),
  })),
});
type CreateValues = z.infer<typeof createSchema>;
type CreateInput = z.input<typeof createSchema>;

export function ActivitiesPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const role = appRole(principal);
  const canManage = role === "SUPER_ADMIN";
  const [campaign, setCampaign] = useState("");
  const [scoring, setScoring] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [limitActivity, setLimitActivity] = useState<Activity | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const activities = useQuery({
    queryKey: queryKeys.tenant(tenant, "activities", { campaign, actionDate: today }),
    queryFn: () => activityService.list(campaign || undefined, today),
  });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const form = useForm<CreateInput, unknown, CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      scoringType: "FIXED",
      points: 0,
      evidenceRequired: true,
      repeatable: true,
      status: "ACTIVE",
      itemTypes: [],
    },
  });
  const itemTypes = useFieldArray({ control: form.control, name: "itemTypes" });
  const saveActivity = useMutation({
    mutationFn: (values: CreateValues) => editingActivity
      ? activityService.update(editingActivity.id, values)
      : activityService.create(values),
    onSuccess: async () => {
      toast.success(editingActivity ? "Atividade atualizada" : "Atividade criada");
      form.reset({
        scoringType: "FIXED",
        points: 0,
        evidenceRequired: true,
        repeatable: true,
        status: "ACTIVE",
        itemTypes: [],
      });
      setEditingActivity(null);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "activities") });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível salvar a atividade")),
  });
  const updateLimits = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<Activity> }) =>
      activityService.update(id, values),
    onSuccess: async () => {
      toast.success("Limites atualizados");
      setLimitActivity(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "activities") });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível atualizar os limites")),
  });
  const removeActivity = useMutation({
    mutationFn: activityService.remove,
    onSuccess: async () => {
      toast.success("Atividade desativada");
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenantResource(tenant, "activities") });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível desativar a atividade")),
  });

  const openCreate = () => {
    setEditingActivity(null);
    form.reset({
      scoringType: "FIXED",
      points: 0,
      evidenceRequired: true,
      repeatable: true,
      status: "ACTIVE",
      itemTypes: [],
    });
    setShowForm((value) => !value);
  };
  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      campaignId: activity.campaignId ?? "",
      name: activity.name ?? "",
      description: activity.description ?? "",
      scoringType: activity.scoringType ?? "FIXED",
      points: activity.points ?? 0,
      unit: activity.unit ?? "",
      maxOccurrences: activity.maxOccurrences ?? undefined,
      maxOccurrencesPerMonth: activity.maxOccurrencesPerMonth ?? undefined,
      maxOccurrencesPerParticipant: activity.maxOccurrencesPerParticipant ?? undefined,
      maxOccurrencesPerParticipantPerMonth: activity.maxOccurrencesPerParticipantPerMonth ?? undefined,
      minimumParticipants: activity.minimumParticipants ?? undefined,
      minimumQuantity: activity.minimumQuantity ?? undefined,
      minimumParticipationPercent: activity.minimumParticipationPercent ?? undefined,
      evidenceRequired: activity.evidenceRequired ?? true,
      repeatable: activity.repeatable ?? true,
      status: activity.status ?? "ACTIVE",
      itemTypes: (activity.itemTypes ?? []).map((item) => ({
        name: item.name ?? "",
        pointsPerUnit: item.pointsPerUnit ?? item.points ?? 0,
        unit: item.unit ?? "",
        minimumQuantity: item.minimumQuantity,
      })),
    });
    setShowForm(true);
  };

  const filtered = useMemo(
    () =>
      (activities.data ?? []).filter(
        (activity) =>
          !scoring || activity.scoringType === scoring,
      ),
    [activities.data, scoring],
  );

  if (activities.isLoading || campaigns.isLoading) return <LoadingState />;
  if (activities.error || campaigns.error) return <ErrorState error={activities.error ?? campaigns.error} retry={() => void Promise.all([activities.refetch(), campaigns.refetch()])} />;

  return (
    <>
      <PageHeading
        eyebrow={canManage ? "Administração global" : "Possibilidades de impacto"}
        title="Atividades"
        description={canManage
          ? "Crie, edite, limite e desative as atividades disponíveis para todas as equipes."
          : "Veja as regras, a disponibilidade e escolha como contribuir."}
        action={canManage ? <Button onClick={openCreate}><Plus size={17} /> Nova atividade</Button> : undefined}
      />
      {showForm && canManage ? (
        <Card className="inline-form-card">
          <div className="card-heading"><div><p className="eyebrow">Configuração global</p><h3>{editingActivity ? "Editar atividade" : "Nova atividade"}</h3></div></div>
          <form className="form-grid" onSubmit={form.handleSubmit((values) => saveActivity.mutate({ ...values, description: values.description || undefined, unit: values.unit || undefined }))}>
            <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
              <select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </Field>
            <Field label="Nome" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
            <Field label="Tipo de pontuação"><select className="input" {...form.register("scoringType")}>{Object.entries(scoringLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Pontos"><Input type="number" min="0" step="0.1" {...form.register("points")} /></Field>
            <Field label="Unidade"><Input placeholder="ex.: kg, item, kit" {...form.register("unit")} /></Field>
            <Field label="Limite de ocorrências"><Input type="number" min="1" {...form.register("maxOccurrences")} /></Field>
            <Field label="Limite mensal"><Input type="number" min="1" {...form.register("maxOccurrencesPerMonth")} /></Field>
            <Field label="Limite por participante"><Input type="number" min="1" {...form.register("maxOccurrencesPerParticipant")} /></Field>
            <Field label="Limite participante/mês"><Input type="number" min="1" {...form.register("maxOccurrencesPerParticipantPerMonth")} /></Field>
            <Field label="Quantidade mínima"><Input type="number" min="0" step="0.1" {...form.register("minimumQuantity")} /></Field>
            <Field label="Participantes mínimos"><Input type="number" min="1" {...form.register("minimumParticipants")} /></Field>
            <Field label="Participação mínima (%)"><Input type="number" min="0" max="100" step="0.1" {...form.register("minimumParticipationPercent")} /></Field>
            <label className="remember-option">
              <input type="checkbox" {...form.register("evidenceRequired")} />
              Exigir evidência no envio
            </label>
            <label className="remember-option">
              <input type="checkbox" {...form.register("repeatable")} />
              Permitir repetição
            </label>
            <Field label="Status">
              <select className="input" {...form.register("status")}>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
            </Field>
            <div className="activity-items-editor">
              <div>
                <strong>Itens e faixas de pontuação</strong>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => itemTypes.append({
                    name: "",
                    pointsPerUnit: 0,
                    unit: "unidade",
                    minimumQuantity: undefined,
                  })}
                >
                  <Plus size={15} /> Adicionar item
                </Button>
              </div>
              {itemTypes.fields.map((field, index) => (
                <Card key={field.id} className="activity-item-editor-row">
                  <Field label="Nome" error={form.formState.errors.itemTypes?.[index]?.name?.message}>
                    <Input {...form.register(`itemTypes.${index}.name`)} />
                  </Field>
                  <Field label="Pontos por unidade">
                    <Input type="number" min="0" step="0.1" {...form.register(`itemTypes.${index}.pointsPerUnit`)} />
                  </Field>
                  <Field label="Unidade" error={form.formState.errors.itemTypes?.[index]?.unit?.message}>
                    <Input {...form.register(`itemTypes.${index}.unit`)} />
                  </Field>
                  <Field label="Quantidade mínima">
                    <Input type="number" min="0" step="0.1" {...form.register(`itemTypes.${index}.minimumQuantity`)} />
                  </Field>
                  <Button type="button" variant="ghost" onClick={() => itemTypes.remove(index)}>
                    <Trash2 size={15} /> Remover
                  </Button>
                </Card>
              ))}
            </div>
            <Field label="Descrição"><textarea className="input" {...form.register("description")} /></Field>
            <div className="form-actions">
              <Button variant="secondary" type="button" onClick={() => {
                setShowForm(false);
                setEditingActivity(null);
              }}>Cancelar</Button>
              <Button loading={saveActivity.isPending}>{editingActivity ? "Salvar atividade" : "Criar atividade"}</Button>
            </div>
          </form>
        </Card>
      ) : null}
      <Card className="filter-bar">
        <Filter size={17} />
        <Select value={campaign} onChange={(event) => setCampaign(event.target.value)} aria-label="Filtrar campanha">
          <option value="">Todas as campanhas</option>
          {(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select value={scoring} onChange={(event) => setScoring(event.target.value)} aria-label="Filtrar pontuação">
          <option value="">Todos os tipos</option>
          {Object.entries(scoringLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Card>
      {filtered.length ? (
        <section className="activity-grid">
          {filtered.map((activity) => {
            const availability = activityAvailability(activity);
            const max = activity.maxOccurrences ?? (activity.repeatable ? null : 1);
            return (
              <Card key={activity.id} className="activity-card">
                <div className="activity-card-top">
                  <span className="activity-symbol"><Sparkles size={19} /></span>
                  {canManage ? (
                    <span className={`availability ${activity.status === "ACTIVE" ? "available" : "unavailable"}`}>
                      {activity.status === "ACTIVE" ? "Ativa" : "Inativa"}
                    </span>
                  ) : <ActivityAvailabilityBadge available={availability.available} reason={availability.reason} />}
                </div>
                <div className="activity-content">
                  <p className="eyebrow">{activity.scoringType ? scoringLabels[activity.scoringType] : "Atividade"}</p>
                  <h3>{activity.name ?? "Atividade solidária"}</h3>
                  <p>{activity.description ?? "Consulte as orientações da sua organização antes de registrar."}</p>
                </div>
                <div className="activity-meta">
                  <div><span>Pontuação</span><strong>{formatNumber(activity.points)} {activity.scoringType === "FIXED" ? "pts" : `pts / ${activity.unit ?? "un."}`}</strong></div>
                  {max ? <div><span>Registros da equipe</span><strong>{availability.used} de {max}</strong></div> : <div><span>Recorrência</span><strong>Livre</strong></div>}
                </div>
                {max ? <div className="progress-track"><span style={{ width: `${Math.min(100, (availability.used / max) * 100)}%` }} /></div> : null}
                <ActivityLimitSummary activity={activity} availability={activity.availability} />
                {activity.availability ? <ActivityAvailabilityDetails availability={activity.availability} /> : null}
                {canManage ? (
                  <div className="management-actions">
                    <Button type="button" variant="secondary" onClick={() => openEdit(activity)}>
                      <Pencil size={15} /> Editar
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setLimitActivity(activity)}>
                      Configurar limites
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setPendingDelete(activity)}>
                      <Trash2 size={15} /> Desativar
                    </Button>
                  </div>
                ) : null}
                {role === "MEMBER" || role === "MANAGER" ? (
                  availability.available ? <Link className="button button-primary activity-action" href={`/submissions/new?activityId=${activity.id}`}>Registrar esta ação <ArrowRight size={16} /></Link> : <button className="button button-secondary activity-action" disabled title={availability.reason ?? undefined}>Registro indisponível</button>
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : <EmptyState title="Nenhuma atividade encontrada" description="Altere os filtros ou cadastre uma atividade para começar." />}
      {limitActivity ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setLimitActivity(null)}>
          <Card
            className="limit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="limit-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Regras da atividade</p>
            <h2 id="limit-dialog-title">{limitActivity.name}</h2>
            <ActivityLimitForm
              activity={limitActivity}
              loading={updateLimits.isPending}
              onCancel={() => setLimitActivity(null)}
              onSubmit={(values) =>
                updateLimits.mutate({
                  id: limitActivity.id,
                  values: Object.fromEntries(
                    Object.entries(values).filter(([, value]) => value !== undefined),
                  ) as Partial<Activity>,
                })
              }
            />
          </Card>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Desativar esta atividade?"
        description="O histórico será preservado e novos registros ficarão indisponíveis."
        confirmLabel="Desativar atividade"
        destructive
        loading={removeActivity.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeActivity.mutate(pendingDelete.id)}
      />
    </>
  );
}
