import type { Activity } from "@/lib/types";

export function activityAvailability(activity: Activity) {
  const availability = activity.availability;
  return {
    available: availability?.available ?? false,
    used: availability?.approvedOccurrences ?? 0,
    reason: availability?.reason ?? null,
    blockScope: availability?.blockScope ?? null,
    blockedUntil: availability?.blockedUntil ?? null,
    remainingOccurrences: availability?.remainingOccurrences ?? null,
    remainingOccurrencesThisMonth:
      availability?.remainingOccurrencesThisMonth ?? null,
  };
}
