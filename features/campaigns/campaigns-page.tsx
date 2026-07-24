"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { campaignService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/utils";

const schema = z.object({ name: z.string().min(3), description: z.string().optional(), startsAt: z.string().min(1), endsAt: z.string().min(1), minimumActionsPerMonth: z.coerce.number().min(0).optional() }).refine((value) => value.endsAt >= value.startsAt, { path: ["endsAt"], message: "A data final deve ser posterior à inicial" });
type Values = z.infer<typeof schema>;
type InputValues = z.input<typeof schema>;
export function CampaignsPage() {
  const { principal } = useSession(); const queryClient = useQueryClient(); const tenant = principal?.organizationId ?? null;
  const [showForm, setShowForm] = useState(false);
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const form = useForm<InputValues, unknown, Values>({ resolver: zodResolver(schema) });
  const create = useMutation({ mutationFn: campaignService.create, onSuccess: async () => { toast.success("Campanha criada"); setShowForm(false); form.reset(); await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "campaigns") }); }, onError: (error) => toast.error(error.message) });
  if (campaigns.isLoading) return <LoadingState />; if (campaigns.error) return <ErrorState error={campaigns.error} />;
  return <><PageHeading eyebrow="Ciclos de mobilização" title="Campanhas" description="Organize períodos, propósito e ritmo de participação da equipe." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Nova campanha</Button>} />
    {showForm ? <Card className="inline-form-card"><form className="form-grid" onSubmit={form.handleSubmit((values) => create.mutate({ ...values, status: "DRAFT", description: values.description || undefined }))}>
      <Field label="Nome"><Input {...form.register("name")} /></Field><Field label="Data inicial"><Input type="date" {...form.register("startsAt")} /></Field><Field label="Data final" error={form.formState.errors.endsAt?.message}><Input type="date" {...form.register("endsAt")} /></Field><Field label="Mínimo de ações por mês"><Input type="number" min="0" {...form.register("minimumActionsPerMonth")} /></Field><Field label="Descrição"><textarea className="input" {...form.register("description")} /></Field><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button loading={create.isPending}>Criar campanha</Button></div>
    </form></Card> : null}
    {(campaigns.data ?? []).length ? <div className="campaign-grid">{campaigns.data!.map((item) => <Card key={item.id} className="campaign-card"><div className="campaign-icon"><CalendarRange /></div><span className="soft-label">{item.status ?? "DRAFT"}</span><h3>{item.name ?? "Campanha"}</h3><p>{item.description ?? "Um novo ciclo de impacto coletivo."}</p><div className="campaign-period"><span>{formatDate(item.startsAt)}</span><i /><span>{formatDate(item.endsAt)}</span></div><Button variant="secondary" onClick={() => campaignService.update(item.id, { status: item.status === "ACTIVE" ? "CLOSED" : "ACTIVE" }).then(() => campaigns.refetch())}>{item.status === "ACTIVE" ? "Encerrar campanha" : "Ativar campanha"}</Button></Card>)}</div> : <EmptyState title="Nenhuma campanha criada" description="Crie um ciclo para agrupar atividades, metas e resultados." />}
  </>;
}
