"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Target, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { GoalProgress } from "@/components/goal-progress";
import { Button, Card, Field, Input } from "@/components/ui";
import type {
  Activity,
  Campaign,
  Goal,
  GoalProgress as GoalProgressData,
  MonthlyPlanInput,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type GoalStatus = GoalProgressData["status"];
const statusLabels: Record<GoalStatus, string> = {
  NOT_STARTED: "Ainda não iniciada",
  IN_PROGRESS: "Em andamento",
  ACHIEVED: "Alcançada",
  EXPIRED: "Encerrada",
};
const typeLabels = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  CAMPAIGN: "Campanha",
  CUSTOM: "Personalizada",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <span className={`goal-status goal-status-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

export function GoalProgressBar(props: React.ComponentProps<typeof GoalProgress>) {
  return <GoalProgress {...props} />;
}

export function GoalCard({
  goal,
  progress,
  loading,
  onDelete,
}: {
  goal: Goal;
  progress?: GoalProgressData;
  loading?: boolean;
  onDelete?: () => void;
}) {
  return (
    <Card className="managed-goal">
      <span className="metric-icon metric-green"><Target /></span>
      <div>
        <div className="goal-card-heading">
          <div>
            <span className="soft-label">{goal.type ? typeLabels[goal.type] : "Meta"}</span>
            <h3>{goal.title ?? "Meta da equipe"}</h3>
            <small>{formatDate(goal.startsAt)} — {formatDate(goal.endsAt)}</small>
          </div>
          {progress ? <GoalStatusBadge status={progress.status} /> : null}
        </div>
        {goal.description ? <p className="muted-copy">{goal.description}</p> : null}
        {loading ? <p className="muted-copy">Carregando progresso oficial…</p> : null}
        {progress ? (
          <>
            <div className="goal-overall">
              <strong>{progress.overallPercentage}%</strong>
              <span>progresso geral</span>
            </div>
            {progress.targets.points > 0 ? <GoalProgressBar label="Pontos" current={progress.achieved.points} target={progress.targets.points} /> : null}
            {progress.targets.actions > 0 ? <GoalProgressBar label="Ações" current={progress.achieved.actions} target={progress.targets.actions} kind="ações" /> : null}
            {progress.targets.participants > 0 ? <GoalProgressBar label="Participantes" current={progress.achieved.participants} target={progress.targets.participants} kind="participantes" /> : null}
            {progress.targets.quantity > 0 ? <GoalProgressBar label={`Quantidade${goal.unit ? ` (${goal.unit})` : ""}`} current={progress.achieved.quantity} target={progress.targets.quantity} kind={goal.unit ?? "unidades"} /> : null}
          </>
        ) : null}
        {onDelete ? <Button type="button" variant="ghost" className="goal-delete" onClick={onDelete}><Trash2 size={15} /> Excluir meta</Button> : null}
      </div>
    </Card>
  );
}

const optionalTarget = z.preprocess(
  (value) => value === "" ? 0 : value,
  z.coerce.number().min(0),
);
const goalFormSchema = z.object({
  title: z.string().min(3, "Informe um título").max(180),
  description: z.string().optional(),
  campaignId: z.string().min(1, "Selecione uma campanha"),
  activityId: z.string().optional(),
  type: z.enum(["WEEKLY", "MONTHLY", "CAMPAIGN", "CUSTOM"]),
  startsAt: z.string().min(1, "Informe a data inicial"),
  endsAt: z.string().min(1, "Informe a data final"),
  targetPoints: optionalTarget,
  targetActions: optionalTarget,
  targetParticipants: optionalTarget,
  targetQuantity: optionalTarget,
  unit: z.string().max(40).optional(),
}).superRefine((value, context) => {
  if (![value.targetPoints, value.targetActions, value.targetParticipants, value.targetQuantity].some((target) => target > 0)) {
    context.addIssue({ code: "custom", path: ["targetPoints"], message: "Defina pelo menos um objetivo maior que zero." });
  }
  if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "A data final deve ser posterior à inicial." });
  }
});
export type GoalFormValues = z.infer<typeof goalFormSchema>;
type GoalFormInput = z.input<typeof goalFormSchema>;

export function GoalForm({
  campaigns,
  activities,
  loading,
  onCancel,
  onSubmit,
}: {
  campaigns: Campaign[];
  activities: Activity[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: GoalFormValues) => void;
}) {
  const form = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "", description: "", campaignId: "", activityId: "", type: "WEEKLY",
      targetPoints: 0, targetActions: 0, targetParticipants: 0, targetQuantity: 0, unit: "",
    },
  });
  const campaignId = useWatch({ control: form.control, name: "campaignId" });
  const campaign = campaigns.find((item) => item.id === campaignId);
  const availableActivities = activities.filter((item) => item.campaignId === campaignId);
  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => onSubmit({ ...values, description: values.description || undefined, activityId: values.activityId || undefined, unit: values.unit || undefined }))}>
      <Field label="Título" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
      <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
        <select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </Field>
      <Field label="Modalidade (opcional)"><select className="input" {...form.register("activityId")}><option value="">Campanha completa</option>{availableActivities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Tipo"><select className="input" {...form.register("type")}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Início" error={form.formState.errors.startsAt?.message}><Input type="date" min={campaign?.startsAt?.slice(0, 10)} max={campaign?.endsAt?.slice(0, 10)} {...form.register("startsAt")} /></Field>
      <Field label="Fim" error={form.formState.errors.endsAt?.message}><Input type="date" min={campaign?.startsAt?.slice(0, 10)} max={campaign?.endsAt?.slice(0, 10)} {...form.register("endsAt")} /></Field>
      <Field label="Meta de pontos" error={form.formState.errors.targetPoints?.message}><Input type="number" min="0" step="0.1" {...form.register("targetPoints")} /></Field>
      <Field label="Meta de ações"><Input type="number" min="0" step="1" {...form.register("targetActions")} /></Field>
      <Field label="Meta de participantes"><Input type="number" min="0" step="1" {...form.register("targetParticipants")} /></Field>
      <Field label="Meta de quantidade"><Input type="number" min="0" step="0.1" {...form.register("targetQuantity")} /></Field>
      <Field label="Unidade"><Input placeholder="kg, itens, kits…" {...form.register("unit")} /></Field>
      <Field label="Descrição"><textarea className="input" {...form.register("description")} /></Field>
      <div className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button loading={loading}>Criar meta</Button></div>
    </form>
  );
}

const monthlySchema = z.object({
  campaignId: z.string().min(1, "Selecione uma campanha"),
  activityId: z.string().optional(),
  titlePrefix: z.string().min(3, "Informe um prefixo").max(140),
  targetPoints: optionalTarget,
  targetActions: optionalTarget,
  targetParticipants: optionalTarget,
  targetQuantity: optionalTarget,
  unit: z.string().max(40).optional(),
}).superRefine((value, context) => {
  if (![value.targetPoints, value.targetActions, value.targetParticipants, value.targetQuantity].some((target) => target > 0)) {
    context.addIssue({ code: "custom", path: ["targetPoints"], message: "Defina pelo menos um objetivo maior que zero." });
  }
});
type MonthlyInput = z.input<typeof monthlySchema>;
type MonthlyValues = z.infer<typeof monthlySchema>;

function monthPreview(campaign?: Campaign) {
  if (!campaign?.startsAt || !campaign.endsAt) return [];
  const result: string[] = [];
  const cursor = new Date(`${campaign.startsAt.slice(0, 7)}-01T12:00:00Z`);
  const end = new Date(`${campaign.endsAt.slice(0, 7)}-01T12:00:00Z`);
  while (cursor <= end) {
    result.push(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

export function MonthlyPlanForm({
  campaigns,
  activities,
  loading,
  onCancel,
  onSubmit,
}: {
  campaigns: Campaign[];
  activities: Activity[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: MonthlyPlanInput) => void;
}) {
  const form = useForm<MonthlyInput, unknown, MonthlyValues>({
    resolver: zodResolver(monthlySchema),
    defaultValues: { campaignId: "", activityId: "", titlePrefix: "Plano mensal", targetPoints: 0, targetActions: 0, targetParticipants: 0, targetQuantity: 0, unit: "" },
  });
  const campaignId = useWatch({ control: form.control, name: "campaignId" });
  const campaign = campaigns.find((item) => item.id === campaignId);
  const months = monthPreview(campaign);
  return (
    <form className="monthly-plan-form" onSubmit={form.handleSubmit((values) => onSubmit({ ...values, activityId: values.activityId || undefined, unit: values.unit || undefined }))}>
      <div className="monthly-plan-title"><CalendarClock /><div><strong>Gerar plano mensal</strong><p>Uma meta será criada para cada mês da campanha.</p></div></div>
      <div className="form-grid">
        <Field label="Campanha" error={form.formState.errors.campaignId?.message}><select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Modalidade (opcional)"><select className="input" {...form.register("activityId")}><option value="">Campanha completa</option>{activities.filter((item) => item.campaignId === campaignId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Prefixo do título" error={form.formState.errors.titlePrefix?.message}><Input {...form.register("titlePrefix")} /></Field>
        <Field label="Pontos mensais" error={form.formState.errors.targetPoints?.message}><Input type="number" min="0" {...form.register("targetPoints")} /></Field>
        <Field label="Ações mensais"><Input type="number" min="0" {...form.register("targetActions")} /></Field>
        <Field label="Participantes mensais"><Input type="number" min="0" {...form.register("targetParticipants")} /></Field>
        <Field label="Quantidade mensal"><Input type="number" min="0" step="0.1" {...form.register("targetQuantity")} /></Field>
        <Field label="Unidade"><Input {...form.register("unit")} /></Field>
      </div>
      {months.length ? <div className="monthly-preview"><strong>Preview: {months.length} metas</strong><div>{months.map((month) => <span key={month}>{month}</span>)}</div></div> : null}
      <div className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button loading={loading} disabled={!months.length}>Criar {months.length || ""} metas</Button></div>
    </form>
  );
}
