"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FilePlus2, Filter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Card, PageHeading, Select } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { useSession } from "@/features/auth/session-provider";
import { submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { appRole } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

export function SubmissionsPage() {
  const { principal } = useSession();
  const tenant = principal?.organizationId ?? null;
  const role = appRole(principal);
  const [status, setStatus] = useState("");
  const submissions = useQuery({
    queryKey: queryKeys.tenant(tenant, role === "MEMBER" ? "my-submissions" : "submissions", status),
    queryFn: () => submissionService.list(status || undefined),
  });
  if (submissions.isLoading) return <LoadingState />;
  if (submissions.error) return <ErrorState error={submissions.error} retry={() => void submissions.refetch()} />;

  return (
    <>
      <PageHeading
        eyebrow="Andamento compartilhado"
        title="Ações da equipe"
        description="Toda a equipe acompanha os registros, os pontos pendentes e o que já foi aprovado."
        action={<Link href="/submissions/new" className="button button-primary"><FilePlus2 size={17} /> Nova ação</Link>}
      />
      <Card className="filter-bar">
        <Filter size={17} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunho</option>
          <option value="SUBMITTED">Enviada</option>
          <option value="UNDER_REVIEW">Em análise</option>
          <option value="NEEDS_CHANGES">Complemento solicitado</option>
          <option value="APPROVED">Aprovada</option>
          <option value="PARTIALLY_APPROVED">Aprovada parcialmente</option>
          <option value="REJECTED">Rejeitada</option>
        </Select>
      </Card>
      {(submissions.data ?? []).length ? (
        <div className="submission-list">
          {(submissions.data ?? []).map((item) => (
            <Card key={item.id} className="submission-row">
              <div className="submission-row-date"><strong>{item.actionDate ? new Date(item.actionDate).getDate().toString().padStart(2, "0") : "—"}</strong><span>{item.actionDate ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(item.actionDate)) : ""}</span></div>
              <div className="submission-row-main">
                <div><h3>{item.activity?.name ?? "Ação solidária"}</h3><p>{item.institutionName ?? "Instituição não informada"} · {formatDate(item.actionDate)}</p></div>
                <StatusBadge status={item.status} />
              </div>
              <div className="submission-points"><span>{item.status === "APPROVED" || item.status === "PARTIALLY_APPROVED" ? "Aprovados" : "Estimados"}</span><strong>{formatNumber(item.status === "APPROVED" || item.status === "PARTIALLY_APPROVED" ? item.approvedPoints : item.calculatedPoints)}</strong></div>
              <Link href={`/submissions/${item.id}`} className="icon-button row-arrow" aria-label="Ver detalhes"><ArrowRight size={18} /></Link>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="Nenhuma ação por aqui" description="O primeiro registro da equipe pode começar como rascunho e ser enviado quando estiver pronto." action={<Link href="/activities" className="button button-secondary">Explorar atividades</Link>} />}
    </>
  );
}
