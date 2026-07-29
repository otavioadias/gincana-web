"use client";

import { Check, CircleSlash2, Gauge } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Field, Input } from "@/components/ui";
import type { Activity, ActivityAvailability } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ActivityAvailabilityBadge({
  available,
  reason,
}: {
  available: boolean;
  reason?: string | null;
}) {
  return (
    <span className={`availability ${available ? "available" : "unavailable"}`} title={reason ?? undefined}>
      {available ? <Check size={12} /> : <CircleSlash2 size={12} />}
      {available ? "Disponível" : "Indisponível"}
    </span>
  );
}

const scopeLabels = {
  CAMPAIGN: "Campanha",
  MONTH: "Mês",
  DATE: "Data",
};

export function ActivityAvailabilityDetails({
  availability,
}: {
  availability: ActivityAvailability;
}) {
  if (availability.available) return null;
  return (
    <div className="availability-details" role="status">
      <strong>{availability.reason ?? "Ação indisponível"}</strong>
      <span>
        Escopo: {availability.blockScope ? scopeLabels[availability.blockScope] : "não informado"}
      </span>
      {availability.blockedUntil ? <span>Liberação: {formatDate(availability.blockedUntil)}</span> : null}
    </div>
  );
}

export function ActivityLimitSummary({
  activity,
  availability,
}: {
  activity: Activity;
  availability?: ActivityAvailability;
}) {
  return (
    <div className="activity-limit-summary">
      <Gauge size={16} aria-hidden />
      <dl>
        <div>
          <dt>Restante na campanha</dt>
          <dd>{availability?.remainingOccurrences ?? "Sem limite"}</dd>
        </div>
        <div>
          <dt>Restante no mês</dt>
          <dd>{availability?.remainingOccurrencesThisMonth ?? "Sem limite"}</dd>
        </div>
        <div>
          <dt>Mínimo de participantes</dt>
          <dd>{activity.minimumParticipants ?? "Não definido"}</dd>
        </div>
        <div>
          <dt>Participação mínima</dt>
          <dd>{activity.minimumParticipationPercent == null ? "Não definida" : `${activity.minimumParticipationPercent}%`}</dd>
        </div>
      </dl>
    </div>
  );
}

interface ActivityLimitValues {
  minimumQuantity: string;
  minimumParticipants: string;
  minimumParticipationPercent: string;
  maxOccurrences: string;
  maxOccurrencesPerMonth: string;
  maxOccurrencesPerParticipant: string;
  maxOccurrencesPerParticipantPerMonth: string;
}

function parseOptional(value: string, minimum: number, maximum?: number): number | null | false {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) return false;
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
      minimumQuantity: activity.minimumQuantity?.toString() ?? "",
      minimumParticipants: activity.minimumParticipants?.toString() ?? "",
      minimumParticipationPercent: activity.minimumParticipationPercent?.toString() ?? "",
      maxOccurrences: activity.maxOccurrences?.toString() ?? "",
      maxOccurrencesPerMonth: activity.maxOccurrencesPerMonth?.toString() ?? "",
      maxOccurrencesPerParticipant: activity.maxOccurrencesPerParticipant?.toString() ?? "",
      maxOccurrencesPerParticipantPerMonth: activity.maxOccurrencesPerParticipantPerMonth?.toString() ?? "",
    });
  }, [activity, form]);

  return (
    <form
      className="limit-form"
      onSubmit={form.handleSubmit((values) => {
        const parsed = {
          minimumQuantity: parseOptional(values.minimumQuantity, 0),
          minimumParticipants: parseOptional(values.minimumParticipants, 1),
          minimumParticipationPercent: parseOptional(values.minimumParticipationPercent, 0, 100),
          maxOccurrences: parseOptional(values.maxOccurrences, 1),
          maxOccurrencesPerMonth: parseOptional(values.maxOccurrencesPerMonth, 1),
          maxOccurrencesPerParticipant: parseOptional(values.maxOccurrencesPerParticipant, 1),
          maxOccurrencesPerParticipantPerMonth: parseOptional(values.maxOccurrencesPerParticipantPerMonth, 1),
        };
        if (Object.values(parsed).some((value) => value === false)) {
          form.setError("root", { message: "Use apenas valores positivos dentro dos limites indicados." });
          return;
        }
        onSubmit(parsed as Partial<Activity>);
      })}
    >
      <div className="form-grid two-columns">
        <Field label="Máximo na campanha" hint="Em branco remove o limite."><Input type="number" min="1" {...form.register("maxOccurrences")} /></Field>
        <Field label="Máximo por mês" hint="Limite mensal da equipe."><Input type="number" min="1" {...form.register("maxOccurrencesPerMonth")} /></Field>
        <Field label="Máximo por participante" hint="Na campanha inteira."><Input type="number" min="1" {...form.register("maxOccurrencesPerParticipant")} /></Field>
        <Field label="Máximo por participante/mês" hint="Limite individual mensal."><Input type="number" min="1" {...form.register("maxOccurrencesPerParticipantPerMonth")} /></Field>
        <Field label="Quantidade mínima"><Input type="number" min="0" step="0.1" {...form.register("minimumQuantity")} /></Field>
        <Field label="Participantes mínimos"><Input type="number" min="1" {...form.register("minimumParticipants")} /></Field>
        <Field label="Participação mínima (%)"><Input type="number" min="0" max="100" step="0.1" {...form.register("minimumParticipationPercent")} /></Field>
      </div>
      {form.formState.errors.root?.message ? <p className="field-error" role="alert">{form.formState.errors.root.message}</p> : null}
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button loading={loading}>Salvar limites</Button>
      </div>
    </form>
  );
}
