import type { Activity } from "@/lib/types";

function availabilityReason(reason: string | null, limit: number | null) {
  if (!reason) return null;
  if (reason === "Activity is inactive") return "Atividade pausada pela organização.";
  if (reason.startsWith("Maximum of ")) {
    return limit === 1
      ? "A equipe já enviou o único registro permitido para esta atividade."
      : `Limite de ${limit ?? "ocorrências"} registros enviados atingido.`;
  }
  return reason;
}

export function activityAvailability(activity: Activity) {
  const limit = activity.maxOccurrences ?? (activity.repeatable === false ? 1 : null);
  const used =
    activity.availability?.usedOccurrences ??
    activity.availability?.approvedOccurrences ??
    activity.approvedOccurrences ??
    0;

  if (activity.availability) {
    return {
      available: activity.availability.available,
      used,
      reason: availabilityReason(activity.availability.reason, limit),
    };
  }
  if (activity.status === "INACTIVE") {
    return { available: false, used, reason: "Atividade pausada pela organização." };
  }
  if (limit !== null && used >= limit) {
    return {
      available: false,
      used,
      reason:
        limit === 1
          ? "A equipe já enviou o único registro permitido para esta atividade."
          : `Limite de ${limit} registros enviados atingido.`,
    };
  }
  return { available: true, used, reason: null };
}
