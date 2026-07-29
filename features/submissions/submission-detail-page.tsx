"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ExternalLink, FileText, MapPin, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { Button, Card, PageHeading } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { useSession } from "@/features/auth/session-provider";
import { submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { type SubmissionStatus } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

const timeline: Array<{ status: SubmissionStatus; label: string }> = [
  { status: "DRAFT", label: "Rascunho criado" },
  { status: "SUBMITTED", label: "Enviada para validação" },
  { status: "UNDER_REVIEW", label: "Análise iniciada" },
  { status: "APPROVED", label: "Validação concluída" },
];
const statusOrder: Record<SubmissionStatus, number> = {
  DRAFT: 0, SUBMITTED: 1, UNDER_REVIEW: 2, NEEDS_CHANGES: 3,
  APPROVED: 3, PARTIALLY_APPROVED: 3, REJECTED: 3, CANCELLED: 3,
};

export function SubmissionDetailPage({ id }: { id: string }) {
  const { principal } = useSession();
  const tenant = principal?.organizationId ?? null;
  const submission = useQuery({
    queryKey: queryKeys.tenant(tenant, "submission", id),
    queryFn: () => submissionService.get(id),
  });
  if (submission.isLoading) return <LoadingState />;
  if (submission.error || !submission.data) return <ErrorState error={submission.error ?? new Error("Registro não encontrado")} />;
  const item = submission.data;
  const currentOrder = statusOrder[item.status ?? "DRAFT"];

  async function openEvidence(evidenceId: string) {
    const result = await submissionService.evidenceUrl(id, evidenceId);
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Link href="/submissions" className="back-link"><ArrowLeft size={16} /> Voltar para ações da equipe</Link>
      <PageHeading eyebrow="Detalhes da ação" title={item.activity?.name ?? "Ação solidária"} description={`Registrada em ${formatDate(item.actionDate)}`} action={<StatusBadge status={item.status} />} />
      <div className="detail-grid">
        <div className="detail-main">
          <Card className="detail-card">
            <div className="card-heading"><div><p className="eyebrow">Informações</p><h3>Sobre o registro</h3></div></div>
            <div className="detail-facts">
              <div><CalendarDays /><span>Data</span><strong>{formatDate(item.actionDate)}</strong></div>
              <div><MapPin /><span>Instituição</span><strong>{item.institutionName ?? "Não informada"}</strong></div>
              <div><FileText /><span>Quantidade</span><strong>{formatNumber(item.quantity)} {item.unit ?? ""}</strong></div>
            </div>
            {item.notes ? <div className="notes-box"><MessageSquareText /><div><strong>Observações</strong><p>{item.notes}</p></div></div> : null}
          </Card>
          <Card className="detail-card">
            <div className="card-heading"><div><p className="eyebrow">Evidências</p><h3>Arquivos anexados</h3></div></div>
            {(item.evidences ?? []).length ? <div className="evidence-list">{item.evidences!.map((evidence) => <button key={evidence.id} onClick={() => void openEvidence(evidence.id)}><FileText /><div><strong>{evidence.originalName ?? "Evidência"}</strong><span>{evidence.mimeType ?? "Arquivo"}</span></div><ExternalLink size={16} /></button>)}</div> : <p className="muted-copy">Nenhuma evidência retornada pela API neste detalhe.</p>}
          </Card>
        </div>
        <aside className="detail-side">
          <Card className="points-card"><span>Andamento deste registro</span><strong>{formatNumber(item.status === "APPROVED" || item.status === "PARTIALLY_APPROVED" ? item.approvedPoints : item.calculatedPoints)}</strong><small>{item.status === "APPROVED" || item.status === "PARTIALLY_APPROVED" ? "Pontuação aprovada" : `Estimativa pendente · ${formatNumber(item.approvedPoints)} aprovada até agora`}</small></Card>
          <Card className="timeline-card">
            <p className="eyebrow">Linha do tempo</p>
            <div className="timeline">
              {timeline.map((event, index) => {
                const finalLabel = index === 3 && currentOrder >= 3 ? <StatusBadge status={item.status} /> : event.label;
                return <div key={event.status} className={index <= currentOrder ? "done" : ""}><span /><div><strong>{finalLabel}</strong><small>{index === 0 ? formatDate(item.createdAt) : index === 1 ? formatDate(item.submittedAt) : index === 3 ? formatDate(item.reviewedAt) : "—"}</small></div></div>;
              })}
            </div>
            {item.validationReason ? <div className="review-note"><strong>Retorno da validação</strong><p>{item.validationReason}</p></div> : null}
          </Card>
          {item.status === "DRAFT" ? <Button className="full-button">Continuar rascunho</Button> : null}
        </aside>
      </div>
    </>
  );
}
