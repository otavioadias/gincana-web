"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Target, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { GoalProgress } from "@/components/goal-progress";
import { Button, Card, Field, Input } from "@/components/ui";
import type { Campaign, Goal } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED" | "EXPIRED";

export function goalStatus(
  goal: Goal,
  progress?: { points?: number; actions?: number },
  now = new Date(),
): GoalStatus {
  const startsAt = goal.startsAt ? new Date(goal.startsAt) : null;
  const endsAt = goal.endsAt ? new Date(goal.endsAt) : null;
  const pointsAchieved =
    (goal.targetPoints ?? 0) > 0 && (progress?.points ?? 0) >= (goal.targetPoints ?? 0);
  const actionsAchieved =
    (goal.targetActions ?? 0) > 0 && (progress?.actions ?? 0) >= (goal.targetActions ?? 0);
  const hasPointsTarget = (goal.targetPoints ?? 0) > 0;
  const hasActionsTarget = (goal.targetActions ?? 0) > 0;
  if (
    (hasPointsTarget || hasActionsTarget) &&
    (!hasPointsTarget || pointsAchieved) &&
    (!hasActionsTarget || actionsAchieved)
  ) {
    return "ACHIEVED";
  }
  if (startsAt && startsAt > now) return "NOT_STARTED";
  if (endsAt && endsAt < now) return "EXPIRED";
  return "IN_PROGRESS";
}

const goalStatusLabels: Record<GoalStatus, string> = {
  NOT_STARTED: "Ainda não iniciada",
  IN_PROGRESS: "Em andamento",
  ACHIEVED: "Alcançada",
  EXPIRED: "Encerrada",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <span className={`goal-status goal-status-${status.toLowerCase()}`}>{goalStatusLabels[status]}</span>;
}

export function GoalProgressBar(props: React.ComponentProps<typeof GoalProgress>) {
  return <GoalProgress {...props} />;
}

export function GoalCard({
  goal,
  progress,
  onDelete,
}: {
  goal: Goal;
  progress?: { points: number; actions: number };
  onDelete?: () => void;
}) {
  const status = goalStatus(goal, progress);
  return (
    <Card className="managed-goal">
      <span className="metric-icon metric-green"><Target /></span>
      <div>
        <div className="goal-card-heading">
          <div>
            <span className="soft-label">{goal.type === "WEEKLY" ? "Semanal" : "Mensal"}</span>
            <h3>{formatDate(goal.startsAt)} — {formatDate(goal.endsAt)}</h3>
          </div>
          <GoalStatusBadge status={status} />
        </div>
        {progress ? (
          <>
            {(goal.targetPoints ?? 0) > 0 ? (
              <GoalProgressBar label="Pontos" current={progress.points} target={goal.targetPoints ?? 0} />
            ) : null}
            {(goal.targetActions ?? 0) > 0 ? (
              <GoalProgressBar label="Ações" current={progress.actions} target={goal.targetActions ?? 0} kind="ações" />
            ) : null}
          </>
        ) : (
          <div className="goal-targets">
            {(goal.targetPoints ?? 0) > 0 ? <span>{goal.targetPoints} pontos planejados</span> : null}
            {(goal.targetActions ?? 0) > 0 ? <span>{goal.targetActions} ações planejadas</span> : null}
            <small>O endpoint de metas ainda não retorna progresso realizado.</small>
          </div>
        )}
        {onDelete ? (
          <Button type="button" variant="ghost" className="goal-delete" onClick={onDelete}>
            <Trash2 size={15} /> Excluir meta
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

const goalFormSchema = z
  .object({
    campaignId: z.string().min(1, "Selecione uma campanha"),
    type: z.enum(["WEEKLY", "MONTHLY"]),
    startsAt: z.string().min(1, "Informe a data inicial"),
    endsAt: z.string().min(1, "Informe a data final"),
    targetPoints: z.coerce.number().min(0),
    targetActions: z.coerce.number().int().min(0),
  })
  .superRefine((value, context) => {
    if (value.targetPoints <= 0 && value.targetActions <= 0) {
      context.addIssue({
        code: "custom",
        path: ["targetPoints"],
        message: "Defina pelo menos um objetivo maior que zero.",
      });
    }
    if (value.startsAt && value.endsAt && value.startsAt > value.endsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "A data final deve ser posterior à inicial.",
      });
    }
  });

export type GoalFormValues = z.infer<typeof goalFormSchema>;
type GoalFormInput = z.input<typeof goalFormSchema>;

export function GoalForm({
  campaigns,
  loading,
  onCancel,
  onSubmit,
}: {
  campaigns: Campaign[];
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: GoalFormValues) => void;
}) {
  const form = useForm<GoalFormInput, unknown, GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { campaignId: "", type: "WEEKLY", targetPoints: 0, targetActions: 0 },
  });
  const campaignId = useWatch({ control: form.control, name: "campaignId" });
  const campaign = campaigns.find((item) => item.id === campaignId);

  return (
    <form
      className="form-grid"
      onSubmit={form.handleSubmit((values) => {
        const start = values.startsAt;
        const end = values.endsAt;
        const campaignStart = campaign?.startsAt?.slice(0, 10);
        const campaignEnd = campaign?.endsAt?.slice(0, 10);
        if (
          (campaignStart && start < campaignStart) ||
          (campaignEnd && end > campaignEnd)
        ) {
          form.setError("endsAt", { message: "O período deve permanecer dentro da campanha." });
          return;
        }
        onSubmit(values);
      })}
    >
      <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
        <select className="input" {...form.register("campaignId")}>
          <option value="">Selecione</option>
          {campaigns.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label="Período">
        <select className="input" {...form.register("type")}>
          <option value="WEEKLY">Semanal</option>
          <option value="MONTHLY">Mensal</option>
        </select>
      </Field>
      <Field label="Início" error={form.formState.errors.startsAt?.message}>
        <Input
          type="date"
          min={campaign?.startsAt?.slice(0, 10)}
          max={campaign?.endsAt?.slice(0, 10)}
          {...form.register("startsAt")}
        />
      </Field>
      <Field label="Fim" error={form.formState.errors.endsAt?.message}>
        <Input
          type="date"
          min={campaign?.startsAt?.slice(0, 10)}
          max={campaign?.endsAt?.slice(0, 10)}
          {...form.register("endsAt")}
        />
      </Field>
      <Field label="Pontos desejados" error={form.formState.errors.targetPoints?.message}>
        <Input type="number" min="0" step="0.1" {...form.register("targetPoints")} />
      </Field>
      <Field label="Ações desejadas" error={form.formState.errors.targetActions?.message}>
        <Input type="number" min="0" step="1" {...form.register("targetActions")} />
      </Field>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button loading={loading}>Criar meta</Button>
      </div>
    </form>
  );
}

export function MonthlyPlanForm() {
  return (
    <div className="monthly-plan-unavailable" aria-disabled="true">
      <CalendarClock size={21} aria-hidden />
      <div>
        <strong>Plano mensal</strong>
        <p>
          A geração em lote será habilitada quando <code>POST /goals/monthly-plan</code> fizer parte do OpenAPI.
          Nenhuma meta temporária ou endpoint alternativo será usado.
        </p>
      </div>
    </div>
  );
}
