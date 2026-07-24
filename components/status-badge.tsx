import { cn } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/types";

const labels: Record<SubmissionStatus, string> = {
  DRAFT: "Rascunho",
  SUBMITTED: "Enviada",
  UNDER_REVIEW: "Em análise",
  NEEDS_CHANGES: "Complemento solicitado",
  APPROVED: "Aprovada",
  PARTIALLY_APPROVED: "Aprovada parcialmente",
  REJECTED: "Rejeitada",
  CANCELLED: "Cancelada",
};

export function StatusBadge({ status }: { status?: SubmissionStatus }) {
  if (!status) return <span className="badge badge-neutral">Sem status</span>;
  return <span className={cn("badge", `badge-${status.toLowerCase()}`)}>{labels[status]}</span>;
}
