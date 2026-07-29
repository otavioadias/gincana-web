"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Filter,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { Button, Card, Field, Input, PageHeading, Select } from "@/components/ui";
import { validationSchema, type ValidationValues } from "@/features/validations/validation-schema";
import { translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  campaignService,
  organizationService,
  validationService,
} from "@/lib/services";
import { formatDate, formatNumber } from "@/lib/utils";

type ValidationInput = z.input<typeof validationSchema>;

export function ValidationsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("SUBMITTED");
  const [organizationId, setOrganizationId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const organizations = useQuery({
    queryKey: queryKeys.tenant(null, "organizations"),
    queryFn: organizationService.list,
  });
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(null, "campaigns"),
    queryFn: campaignService.list,
  });
  const submissions = useQuery({
    queryKey: queryKeys.tenant(null, "platform-validation-queue", {
      status,
      organizationId,
      campaignId,
    }),
    queryFn: () => validationService.list(
      status || undefined,
      organizationId || undefined,
      campaignId || undefined,
    ),
  });
  const detail = useQuery({
    queryKey: queryKeys.tenant(null, "admin-submission-detail", selectedId),
    queryFn: () => validationService.get(selectedId),
    enabled: Boolean(selectedId),
  });
  const form = useForm<ValidationInput, unknown, ValidationValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { status: "APPROVED" },
  });
  const decision = useWatch({ control: form.control, name: "status" });
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.tenantResource(null, "platform-validation-queue"),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.tenantResource(null, "admin-team-dashboard"),
    }),
  ]);
  const validate = useMutation({
    mutationFn: (values: ValidationValues) => validationService.validate(selectedId, values),
    onSuccess: async () => {
      toast.success("Validação registrada");
      setSelectedId("");
      form.reset({ status: "APPROVED" });
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível validar a ação")),
  });
  const approve = useMutation({
    mutationFn: () => validationService.approve(selectedId),
    onSuccess: async () => {
      toast.success("Ação aprovada");
      setSelectedId("");
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível aprovar a ação")),
  });

  if (submissions.isLoading || organizations.isLoading || campaigns.isLoading) return <LoadingState />;
  const loadingError = submissions.error ?? organizations.error ?? campaigns.error;
  if (loadingError) {
    return (
      <ErrorState
        error={loadingError}
        retry={() => void Promise.all([
          submissions.refetch(),
          organizations.refetch(),
          campaigns.refetch(),
        ])}
      />
    );
  }

  async function openEvidence(submissionId: string, evidenceId: string) {
    try {
      const { url } = await validationService.evidenceUrl(submissionId, evidenceId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(translateApiError(error, "Não foi possível abrir a evidência"));
    }
  }

  const selected = detail.data;
  return (
    <>
      <PageHeading
        eyebrow="Administração da plataforma"
        title="Validação das ações"
        description="Consulte a fila completa, abra o detalhe oficial e registre a decisão para qualquer equipe."
      />
      <section className="validation-metrics">
        <Card>
          <span className="metric-icon metric-amber"><Clock3 /></span>
          <div><strong>{submissions.data?.length ?? 0}</strong><span>na visualização atual</span></div>
        </Card>
        <Card>
          <span className="metric-icon metric-green"><CheckCircle2 /></span>
          <div><strong>Aprovação</strong><span>direta ou com análise</span></div>
        </Card>
      </section>
      <Card className="filter-bar">
        <Filter size={17} />
        <Select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} aria-label="Filtrar por equipe">
          <option value="">Todas as equipes</option>
          {(organizations.data ?? []).map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </Select>
        <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} aria-label="Filtrar por campanha">
          <option value="">Todas as campanhas</option>
          {(campaigns.data ?? []).map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
          ))}
        </Select>
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
          {submissions.data!.map((item) => (
            <button key={item.id} className="queue-row" onClick={() => setSelectedId(item.id)}>
              <div>
                <span className="activity-symbol"><FileText size={17} /></span>
                <div>
                  <strong>{item.activity?.name ?? "Ação solidária"}</strong>
                  <span>{item.organization?.name ?? "Equipe não identificada"} · {item.institutionName ?? "Instituição não informada"}</span>
                </div>
              </div>
              <span>{formatDate(item.actionDate)}</span>
              <strong>{formatNumber(item.calculatedPoints)} pts</strong>
              <StatusBadge status={item.status} />
              <ChevronRight size={17} />
            </button>
          ))}
        </Card>
      ) : (
        <EmptyState
          title="Nenhuma ação encontrada"
          description="Não há submissões correspondentes aos filtros selecionados."
        />
      )}

      {selectedId ? (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedId("")}>
          <aside className="validation-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">{selected?.organization?.name ?? "Detalhe da ação"}</p>
                <h2>{selected?.activity?.name ?? "Ação solidária"}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedId("")} aria-label="Fechar"><X /></button>
            </div>
            <div className="drawer-body">
              {detail.isLoading ? <LoadingState label="Carregando detalhe…" /> : null}
              {detail.error ? <ErrorState error={detail.error} retry={() => void detail.refetch()} /> : null}
              {selected ? (
                <>
                  <div className="drawer-facts">
                    <div><span>Data</span><strong>{formatDate(selected.actionDate)}</strong></div>
                    <div><span>Instituição</span><strong>{selected.institutionName ?? "—"}</strong></div>
                    <div><span>Estimativa</span><strong>{formatNumber(selected.calculatedPoints)} pts</strong></div>
                  </div>
                  {selected.notes ? (
                    <div className="notes-box"><div><strong>Observações</strong><p>{selected.notes}</p></div></div>
                  ) : null}
                  <div>
                    <p className="drawer-label">Evidências</p>
                    {(selected.evidences ?? []).length ? (
                      <div className="evidence-list">
                        {selected.evidences!.map((evidence) => (
                          <button type="button" key={evidence.id} onClick={() => void openEvidence(selected.id, evidence.id)}>
                            <FileText />
                            <div><strong>{evidence.originalName ?? "Evidência"}</strong><span>{evidence.mimeType}</span></div>
                            <ExternalLink size={16} />
                          </button>
                        ))}
                      </div>
                    ) : <p className="muted-copy">Nenhuma evidência anexada.</p>}
                  </div>
                  {selected.status === "SUBMITTED" || selected.status === "UNDER_REVIEW" ? (
                    <>
                      <Button type="button" variant="secondary" loading={approve.isPending} onClick={() => approve.mutate()}>
                        <CheckCircle2 size={16} /> Aprovar diretamente
                      </Button>
                      <form className="validation-form" onSubmit={form.handleSubmit((values) => validate.mutate(values))}>
                        <Field label="Decisão" error={form.formState.errors.status?.message}>
                          <select className="input" {...form.register("status")}>
                            <option value="APPROVED">Aprovar</option>
                            <option value="PARTIALLY_APPROVED">Aprovar parcialmente</option>
                            <option value="NEEDS_CHANGES">Solicitar complemento</option>
                            <option value="REJECTED">Rejeitar</option>
                          </select>
                        </Field>
                        {decision === "PARTIALLY_APPROVED" ? (
                          <Field label="Pontos aprovados" error={form.formState.errors.approvedPoints?.message}>
                            <Input type="number" min="0" step="0.1" {...form.register("approvedPoints")} />
                          </Field>
                        ) : null}
                        {decision !== "APPROVED" ? (
                          <Field label="Justificativa" error={form.formState.errors.reason?.message}>
                            <textarea className="input" placeholder="Explique de forma respeitosa e objetiva…" {...form.register("reason")} />
                          </Field>
                        ) : null}
                        <Button loading={validate.isPending}>Confirmar validação</Button>
                      </form>
                    </>
                  ) : (
                    <Card className="notes-box">
                      <div>
                        <strong>Validação concluída</strong>
                        <p>{selected.validationReason ?? "Esta ação já recebeu uma decisão."}</p>
                      </div>
                    </Card>
                  )}
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
