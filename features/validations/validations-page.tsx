"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Clock3, ExternalLink, FileText, Filter, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button, Card, Field, Input, PageHeading, Select } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { useSession } from "@/features/auth/session-provider";
import { validationSchema, type ValidationValues } from "@/features/validations/validation-schema";
import { submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import type { Submission } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { z } from "zod";

type ValidationInput = z.input<typeof validationSchema>;

export function ValidationsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const [status, setStatus] = useState("SUBMITTED");
  const [selected, setSelected] = useState<Submission | null>(null);
  const submissions = useQuery({
    queryKey: queryKeys.tenant(tenant, "validation-queue", status),
    queryFn: () => submissionService.list(status || undefined),
  });
  const form = useForm<ValidationInput, unknown, ValidationValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { status: "APPROVED" },
  });
  const decision = useWatch({ control: form.control, name: "status" });
  const validate = useMutation({
    mutationFn: (values: ValidationValues) => submissionService.validate(selected!.id, values),
    onSuccess: async () => {
      toast.success("Validação registrada");
      setSelected(null);
      form.reset({ status: "APPROVED" });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "validation-queue", status) });
    },
    onError: (error) => toast.error(error.message),
  });
  if (submissions.isLoading) return <LoadingState />;
  if (submissions.error) return <ErrorState error={submissions.error} retry={() => void submissions.refetch()} />;

  async function openEvidence(submissionId: string, evidenceId: string) {
    try {
      const { url } = await submissionService.evidenceUrl(submissionId, evidenceId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível abrir a evidência");
    }
  }

  return (
    <>
      <PageHeading eyebrow="Cuidado e transparência" title="Fila de validação" description="Analise cada ação com contexto e ofereça retornos claros para a equipe." />
      <section className="validation-metrics">
        <Card><span className="metric-icon metric-amber"><Clock3 /></span><div><strong>{(submissions.data ?? []).length}</strong><span>na visualização atual</span></div></Card>
        <Card><span className="metric-icon metric-green"><CheckCircle2 /></span><div><strong>Feedback</strong><span>sempre com contexto</span></div></Card>
      </section>
      <Card className="filter-bar">
        <Filter size={17} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar fila">
          <option value="">Todos os status</option>
          <option value="SUBMITTED">Enviadas</option>
          <option value="UNDER_REVIEW">Em análise</option>
          <option value="NEEDS_CHANGES">Complemento solicitado</option>
          <option value="APPROVED">Aprovadas</option>
          <option value="PARTIALLY_APPROVED">Parciais</option>
          <option value="REJECTED">Rejeitadas</option>
        </Select>
      </Card>
      {(submissions.data ?? []).length ? (
        <Card className="queue-card">
          <div className="queue-header"><span>Ação</span><span>Data</span><span>Estimativa</span><span>Status</span><span /></div>
          {(submissions.data ?? []).map((item) => (
            <button key={item.id} className="queue-row" onClick={() => setSelected(item)}>
              <div><span className="activity-symbol"><FileText size={17} /></span><div><strong>{item.activity?.name ?? "Ação solidária"}</strong><span>{item.institutionName ?? "Instituição não informada"}</span></div></div>
              <span>{formatDate(item.actionDate)}</span>
              <strong>{formatNumber(item.calculatedPoints)} pts</strong>
              <StatusBadge status={item.status} />
              <ChevronRight size={17} />
            </button>
          ))}
        </Card>
      ) : <EmptyState title="Fila tranquila por enquanto" description="Não há submissões com este filtro. Novos envios aparecerão aqui." />}

      {selected ? (
        <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}>
          <aside className="validation-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head"><div><p className="eyebrow">Análise</p><h2>{selected.activity?.name ?? "Ação solidária"}</h2></div><button className="icon-button" onClick={() => setSelected(null)} aria-label="Fechar"><X /></button></div>
            <div className="drawer-body">
              <div className="drawer-facts"><div><span>Data</span><strong>{formatDate(selected.actionDate)}</strong></div><div><span>Instituição</span><strong>{selected.institutionName ?? "—"}</strong></div><div><span>Estimativa</span><strong>{formatNumber(selected.calculatedPoints)} pts</strong></div></div>
              {selected.notes ? <div className="notes-box"><div><strong>Observações</strong><p>{selected.notes}</p></div></div> : null}
              <div>
                <p className="drawer-label">Evidências</p>
                {(selected.evidences ?? []).length ? <div className="evidence-list">{selected.evidences!.map((evidence) => <button type="button" key={evidence.id} onClick={() => void openEvidence(selected.id, evidence.id)}><FileText /><div><strong>{evidence.originalName ?? "Evidência"}</strong><span>{evidence.mimeType}</span></div><ExternalLink size={16} /></button>)}</div> : <p className="muted-copy">Nenhuma evidência retornada no detalhe da fila.</p>}
              </div>
              <form className="validation-form" onSubmit={form.handleSubmit((values) => validate.mutate(values))}>
                <Field label="Decisão" error={form.formState.errors.status?.message}>
                  <select className="input" {...form.register("status")}>
                    <option value="APPROVED">Aprovar</option>
                    <option value="PARTIALLY_APPROVED">Aprovar parcialmente</option>
                    <option value="NEEDS_CHANGES">Solicitar complemento</option>
                    <option value="REJECTED">Rejeitar</option>
                  </select>
                </Field>
                {decision === "PARTIALLY_APPROVED" ? <Field label="Pontos aprovados" error={form.formState.errors.approvedPoints?.message}><Input type="number" min="0" step="0.1" {...form.register("approvedPoints")} /></Field> : null}
                {decision !== "APPROVED" ? <Field label="Justificativa" error={form.formState.errors.reason?.message}><textarea className="input" placeholder="Explique de forma respeitosa e objetiva…" {...form.register("reason")} /></Field> : null}
                <Button loading={validate.isPending}>Confirmar validação</Button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
