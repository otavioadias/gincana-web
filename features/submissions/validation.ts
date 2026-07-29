import { activityAvailability } from "@/features/activities/availability";
import type { Activity, Campaign } from "@/lib/types";

interface SubmissionValidationInput {
  activity?: Activity;
  campaign?: Campaign;
  actionDate: string;
  quantity?: number;
  itemQuantities?: number[];
  participantCount: number;
  activeParticipantCount: number;
}

export function minimumParticipantCount(activity: Activity | undefined, activeCount: number) {
  const percentage = activity?.minimumParticipationPercent ?? 0;
  return percentage > 0 ? Math.ceil((activeCount * percentage) / 100) : 0;
}

export function submissionBlockers(input: SubmissionValidationInput) {
  const reasons: string[] = [];
  if (!input.activity) return reasons;

  const availability = activityAvailability(input.activity);
  if (!availability.available && availability.reason) reasons.push(availability.reason);

  const quantity =
    input.activity.scoringType === "PER_ITEM"
      ? (input.itemQuantities ?? []).reduce((total, value) => total + value, 0)
      : (input.quantity ?? 0);
  if (
    input.activity.minimumQuantity !== undefined &&
    quantity < input.activity.minimumQuantity
  ) {
    reasons.push(
      `Informe pelo menos ${input.activity.minimumQuantity} ${input.activity.unit ?? "unidades"}.`,
    );
  }

  const minimumParticipants = minimumParticipantCount(
    input.activity,
    input.activeParticipantCount,
  );
  if (input.participantCount < minimumParticipants) {
    reasons.push(
      `Selecione pelo menos ${minimumParticipants} participante${minimumParticipants === 1 ? "" : "s"} para atingir ${input.activity.minimumParticipationPercent}% da equipe ativa.`,
    );
  }

  if (
    input.activity.name?.toLocaleLowerCase("pt-BR").includes("banco de sangue") &&
    input.participantCount === 0
  ) {
    reasons.push("Banco de Sangue exige pelo menos um participante identificado.");
  }

  if (input.actionDate && input.campaign) {
    const startsAt = input.campaign.startsAt?.slice(0, 10);
    const endsAt = input.campaign.endsAt?.slice(0, 10);
    if (
      (startsAt && input.actionDate < startsAt) ||
      (endsAt && input.actionDate > endsAt)
    ) {
      reasons.push("A data da ação deve estar dentro do período da campanha.");
    }
  }

  return [...new Set(reasons)];
}
