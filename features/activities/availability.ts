import type { Activity, Submission } from "@/lib/types";

const countedStatuses = new Set([
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PARTIALLY_APPROVED",
]);

export function activityAvailability(activity: Activity, submissions: Submission[]) {
  if (activity.status === "INACTIVE") {
    return { available: false, used: 0, reason: "Atividade pausada pela organização." };
  }
  const used = submissions.filter(
    (submission) =>
      submission.activityId === activity.id &&
      submission.status &&
      countedStatuses.has(submission.status),
  ).length;
  if (!activity.repeatable && used > 0) {
    return { available: false, used, reason: "Esta atividade pode ser registrada somente uma vez." };
  }
  if (activity.maxOccurrences && used >= activity.maxOccurrences) {
    return {
      available: false,
      used,
      reason: `Limite de ${activity.maxOccurrences} registro${activity.maxOccurrences > 1 ? "s" : ""} atingido.`,
    };
  }
  return { available: true, used, reason: null };
}
