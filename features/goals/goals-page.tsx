"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoalProgress } from "@/components/goal-progress";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { campaignService, goalService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/utils";

const schema = z.object({ campaignId: z.string().min(1), type: z.enum(["WEEKLY", "MONTHLY"]), startsAt: z.string().min(1), endsAt: z.string().min(1), targetPoints: z.coerce.number().min(0), targetActions: z.coerce.number().min(0) });
type Values = z.infer<typeof schema>;
type InputValues = z.input<typeof schema>;
export function GoalsPage() {
  const { principal } = useSession(); const queryClient = useQueryClient(); const tenant = principal?.organizationId ?? null; const [showForm, setShowForm] = useState(false);
  const goals = useQuery({ queryKey: queryKeys.tenant(tenant, "goals"), queryFn: goalService.list }); const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const form = useForm<InputValues, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { type: "WEEKLY", targetPoints: 0, targetActions: 0 } });
  const create = useMutation({ mutationFn: goalService.create, onSuccess: async () => { toast.success("Meta criada"); form.reset({ type: "WEEKLY", targetPoints: 0, targetActions: 0 }); setShowForm(false); await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "goals") }); }, onError: (error) => toast.error(error.message) });
  if (goals.isLoading || campaigns.isLoading) return <LoadingState />; if (goals.error || campaigns.error) return <ErrorState error={goals.error ?? campaigns.error} />;
  return <><PageHeading eyebrow="Direção compartilhada" title="Metas" description="Defina marcos semanais e mensais para orientar — nunca cobrar — a mobilização." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Nova meta</Button>} />
    {showForm ? <Card className="inline-form-card"><form className="form-grid" onSubmit={form.handleSubmit((values) => create.mutate(values))}><Field label="Campanha"><select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{campaigns.data!.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Período"><select className="input" {...form.register("type")}><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option></select></Field><Field label="Início"><Input type="date" {...form.register("startsAt")} /></Field><Field label="Fim"><Input type="date" {...form.register("endsAt")} /></Field><Field label="Pontos desejados"><Input type="number" min="0" {...form.register("targetPoints")} /></Field><Field label="Ações desejadas"><Input type="number" min="0" {...form.register("targetActions")} /></Field><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button loading={create.isPending}>Criar meta</Button></div></form></Card> : null}
    {(goals.data ?? []).length ? <div className="goal-management-grid">{goals.data!.map((item) => <Card key={item.id} className="managed-goal"><span className="metric-icon metric-green"><Target /></span><div><span className="soft-label">{item.type === "WEEKLY" ? "Semanal" : "Mensal"}</span><h3>{formatDate(item.startsAt)} — {formatDate(item.endsAt)}</h3><GoalProgress label="Pontos planejados" current={0} target={item.targetPoints ?? 0} /><GoalProgress label="Ações planejadas" current={0} target={item.targetActions ?? 0} kind="ações" /></div></Card>)}</div> : <EmptyState title="Ainda não há metas" description="Crie um marco acolhedor para orientar o próximo ciclo da equipe." />}
  </>;
}
