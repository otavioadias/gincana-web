"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, CircleSlash2, Filter, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading, Select } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { activityAvailability } from "@/features/activities/availability";
import { activityService, campaignService, submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { appRole, type ScoringType } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const scoringLabels: Record<ScoringType, string> = {
  FIXED: "Pontos fixos",
  PER_ITEM: "Por item",
  PER_KG: "Por quilo",
  PER_MEMBER: "Por participante",
  PER_COMPLETE_KIT: "Por kit completo",
  TIERED: "Por faixa",
  MANUAL: "Definição manual",
};

const createSchema = z.object({
  campaignId: z.string().min(1, "Selecione uma campanha"),
  name: z.string().min(3, "Informe um nome"),
  description: z.string().optional(),
  scoringType: z.enum(["FIXED", "PER_ITEM", "PER_KG", "PER_MEMBER", "PER_COMPLETE_KIT", "TIERED", "MANUAL"]),
  points: z.coerce.number().min(0),
  unit: z.string().optional(),
  maxOccurrences: z.coerce.number().min(1).optional(),
});
type CreateValues = z.infer<typeof createSchema>;
type CreateInput = z.input<typeof createSchema>;

export function ActivitiesPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const role = appRole(principal);
  const [campaign, setCampaign] = useState("");
  const [scoring, setScoring] = useState("");
  const [showForm, setShowForm] = useState(false);
  const activities = useQuery({ queryKey: queryKeys.tenant(tenant, "activities"), queryFn: activityService.list });
  const submissions = useQuery({ queryKey: queryKeys.tenant(tenant, "submissions-availability"), queryFn: () => submissionService.list() });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const form = useForm<CreateInput, unknown, CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { scoringType: "FIXED", points: 0 } });
  const createActivity = useMutation({
    mutationFn: activityService.create,
    onSuccess: async () => {
      toast.success("Atividade criada");
      form.reset({ scoringType: "FIXED", points: 0 });
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "activities") });
    },
    onError: (error) => toast.error(error.message),
  });

  const filtered = useMemo(
    () =>
      (activities.data ?? []).filter(
        (activity) =>
          (!campaign || activity.campaignId === campaign) &&
          (!scoring || activity.scoringType === scoring),
      ),
    [activities.data, campaign, scoring],
  );

  if (activities.isLoading || submissions.isLoading) return <LoadingState />;
  if (activities.error || submissions.error) return <ErrorState error={activities.error ?? submissions.error} retry={() => void Promise.all([activities.refetch(), submissions.refetch()])} />;

  return (
    <>
      <PageHeading
        eyebrow="Possibilidades de impacto"
        title="Atividades"
        description="Veja as regras, a disponibilidade e escolha como contribuir."
        action={role === "MANAGER" ? <Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Nova atividade</Button> : undefined}
      />
      {showForm ? (
        <Card className="inline-form-card">
          <div className="card-heading"><div><p className="eyebrow">Configuração</p><h3>Nova atividade</h3></div></div>
          <form className="form-grid" onSubmit={form.handleSubmit((values) => createActivity.mutate({ ...values, description: values.description || undefined, unit: values.unit || undefined }))}>
            <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
              <select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </Field>
            <Field label="Nome" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
            <Field label="Tipo de pontuação"><select className="input" {...form.register("scoringType")}>{Object.entries(scoringLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Pontos"><Input type="number" min="0" step="0.1" {...form.register("points")} /></Field>
            <Field label="Unidade"><Input placeholder="ex.: kg, item, kit" {...form.register("unit")} /></Field>
            <Field label="Limite de ocorrências"><Input type="number" min="1" {...form.register("maxOccurrences")} /></Field>
            <Field label="Descrição"><textarea className="input" {...form.register("description")} /></Field>
            <div className="form-actions"><Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</Button><Button loading={createActivity.isPending}>Criar atividade</Button></div>
          </form>
        </Card>
      ) : null}
      <Card className="filter-bar">
        <Filter size={17} />
        <Select value={campaign} onChange={(event) => setCampaign(event.target.value)} aria-label="Filtrar campanha">
          <option value="">Todas as campanhas</option>
          {(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select value={scoring} onChange={(event) => setScoring(event.target.value)} aria-label="Filtrar pontuação">
          <option value="">Todos os tipos</option>
          {Object.entries(scoringLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </Card>
      {filtered.length ? (
        <section className="activity-grid">
          {filtered.map((activity) => {
            const availability = activityAvailability(activity, submissions.data ?? []);
            const max = activity.maxOccurrences ?? (activity.repeatable ? null : 1);
            return (
              <Card key={activity.id} className="activity-card">
                <div className="activity-card-top">
                  <span className="activity-symbol"><Sparkles size={19} /></span>
                  <span className={`availability ${availability.available ? "available" : "unavailable"}`}>
                    {availability.available ? <Check size={12} /> : <CircleSlash2 size={12} />}
                    {availability.available ? "Disponível" : "Indisponível"}
                  </span>
                </div>
                <div className="activity-content">
                  <p className="eyebrow">{activity.scoringType ? scoringLabels[activity.scoringType] : "Atividade"}</p>
                  <h3>{activity.name ?? "Atividade solidária"}</h3>
                  <p>{activity.description ?? "Consulte as orientações da sua organização antes de registrar."}</p>
                </div>
                <div className="activity-meta">
                  <div><span>Pontuação</span><strong>{formatNumber(activity.points)} {activity.scoringType === "FIXED" ? "pts" : `pts / ${activity.unit ?? "un."}`}</strong></div>
                  {max ? <div><span>Seu progresso</span><strong>{availability.used} de {max}</strong></div> : <div><span>Recorrência</span><strong>Livre</strong></div>}
                </div>
                {max ? <div className="progress-track"><span style={{ width: `${Math.min(100, (availability.used / max) * 100)}%` }} /></div> : null}
                {!availability.available ? <p className="limit-reason">{availability.reason}</p> : null}
                {role === "MEMBER" || role === "MANAGER" ? (
                  availability.available ? <Link className="button button-primary activity-action" href={`/submissions/new?activityId=${activity.id}`}>Registrar esta ação <ArrowRight size={16} /></Link> : <button className="button button-secondary activity-action" disabled title={availability.reason ?? undefined}>Registro indisponível</button>
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : <EmptyState title="Nenhuma atividade encontrada" description="Altere os filtros ou cadastre uma atividade para começar." />}
    </>
  );
}
