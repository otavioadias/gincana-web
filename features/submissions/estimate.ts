import type { Activity, ScoringType } from "@/lib/types";

interface EstimateInput {
  quantity?: number;
  participantCount?: number;
  items?: Array<{ quantity: number; points?: number }>;
}

export function estimatePoints(activity: Activity | undefined, input: EstimateInput) {
  if (!activity) return null;
  const points = activity.points ?? 0;
  const type: ScoringType | undefined = activity.scoringType;
  if (type === "FIXED") return points;
  if (type === "PER_ITEM" && input.items?.length) {
    return input.items.reduce((total, item) => total + item.quantity * (item.points ?? points), 0);
  }
  if (type === "PER_KG") return (input.quantity ?? 0) * points;
  if (type === "PER_MEMBER") return (input.participantCount ?? 0) * points;
  if (type === "PER_COMPLETE_KIT") return (input.quantity ?? 0) * points;
  return null;
}
