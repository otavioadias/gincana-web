"use client";

import { Check, CircleSlash2, Gauge } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Field, Input } from "@/components/ui";
import type { Activity } from "@/lib/types";

export function ActivityAvailabilityBadge({
  available,
  reason,
}: {
  available: boolean;
  reason?: string | null;
}) {
  return (
    <span
      className={`availability ${available ? "available" : "unavailable"}`}
      title={reason ?? undefined}
    >
      {available ? <Check size={12} /> : <CircleSlash2 size={12} />}
      {available ? "Disponível" : "Indisponível"}
    </span>
  );
}

export function ActivityLimitSummary({
  activity,
  used = 0,
}: {
  activity: Activity;
  used?: number;
}) {
  const remaining =
    activity.maxOccurrences === undefined
      ? null
      : Math.max(0, activity.maxOccurrences - used);
  return (
    <div className="activity-limit-summary">
      <Gauge size={16} aria-hidden />
      <dl>
        <div>
          <dt>Campanha</dt>
          <dd>
            {activity.maxOccurrences === undefined
              ? "Sem limite"
              : `${remaining} de ${activity.maxOccurrences} restantes`}
          </dd>
        </div>
        <div>
          <dt>Quantidade mínima</dt>
          <dd>{activity.minimumQuantity ?? "Não definida"}</dd>
        </div>
        <div>
          <dt>Participação mínima</dt>
          <dd>
            {activity.minimumParticipationPercent === undefined
              ? "Não definida"
              : `${activity.minimumParticipationPercent}%`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export interface ActivityLimitValues {
  maxOccurrences: string;
  minimumQuantity: string;
  minimumParticipationPercent: string;
}

function optionalPositive(value: string, minimum: number, maximum?: number) {
  if (!value.trim()) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) {
    return null;
  }
  return number;
}

export function ActivityLimitForm({
  activity,
  loading,
  onCancel,
  onSubmit,
}: {
  activity: Activity;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (values: Partial<Activity>) => void;
}) {
  const form = useForm<ActivityLimitValues>();
  useEffect(() => {
    form.reset({
      maxOccurrences: activity.maxOccurrences?.toString() ?? "",
      minimumQuantity: activity.minimumQuantity?.toString() ?? "",
      minimumParticipationPercent:
        activity.minimumParticipationPercent?.toString() ?? "",
    });
  }, [activity, form]);

  return (
    <form
      className="limit-form"
      onSubmit={form.handleSubmit((values) => {
        const maxOccurrences = optionalPositive(values.maxOccurrences, 1);
        const minimumQuantity = optionalPositive(values.minimumQuantity, 0);
        const minimumParticipationPercent = optionalPositive(
          values.minimumParticipationPercent,
          0,
          100,
        );
        if ([maxOccurrences, minimumQuantity, minimumParticipationPercent].includes(null)) {
          form.setError("root", { message: "Revise os limites informados." });
          return;
        }
        onSubmit({
          maxOccurrences: maxOccurrences ?? undefined,
          minimumQuantity: minimumQuantity ?? undefined,
          minimumParticipationPercent: minimumParticipationPercent ?? undefined,
        });
      })}
    >
      <Field label="Máximo na campanha" hint="Em branco representa sem limite.">
        <Input type="number" min="1" step="1" {...form.register("maxOccurrences")} />
      </Field>
      <Field label="Quantidade mínima" hint="Menor quantidade aceita por registro.">
        <Input type="number" min="0" step="0.1" {...form.register("minimumQuantity")} />
      </Field>
      <Field label="Participação mínima (%)" hint="Percentual de integrantes ativos exigido.">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          {...form.register("minimumParticipationPercent")}
        />
      </Field>
      {form.formState.errors.root?.message ? (
        <p className="field-error" role="alert">{form.formState.errors.root.message}</p>
      ) : null}
      <p className="contract-footnote">
        Em uma atividade já limitada, deixar o campo em branco mantém o valor atual: o contrato não
        aceita <code>null</code> para remover o limite. Limites mensais e individuais também ainda não
        fazem parte da API.
      </p>
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button loading={loading}>Salvar limites</Button>
      </div>
    </form>
  );
}
