"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { organizationService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";

const schema = z.object({ name: z.string().min(3), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"), managerName: z.string().min(3), managerEmail: z.email(), managerTemporaryPassword: z.string().min(6), primaryColor: z.string().optional(), secondaryColor: z.string().optional() });
type Values = z.infer<typeof schema>;
export function OrganizationsPage() {
  const queryClient = useQueryClient(); const [showForm, setShowForm] = useState(false);
  const organizations = useQuery({ queryKey: queryKeys.tenant(null, "organizations"), queryFn: organizationService.list });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { primaryColor: "#0d7555", secondaryColor: "#e9a62b" } });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.tenant(null, "organizations") });
  const create = useMutation({ mutationFn: organizationService.create, onSuccess: async () => { toast.success("Equipe e líder inicial criados"); form.reset(); setShowForm(false); await refresh(); }, onError: (error) => toast.error(error.message) });
  const update = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => organizationService.update(id, { status }), onSuccess: async () => { toast.success("Status atualizado"); await refresh(); }, onError: (error) => toast.error(error.message) });
  if (organizations.isLoading) return <LoadingState />; if (organizations.error) return <ErrorState error={organizations.error} />;
  return <><PageHeading eyebrow="Administração da plataforma" title="Equipes" description="Crie equipes já com seu líder inicial, sem vincular o administrador à equipe." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Nova equipe</Button>} />
    <Card className="admin-principle"><ShieldAlert /><div><strong>Separação preservada</strong><p>Administradores gerenciam os cadastros, mas não participam das equipes nem aprovam suas ações.</p></div></Card>
    {showForm ? <Card className="inline-form-card"><div className="card-heading"><div><p className="eyebrow">Nova equipe</p><h3>Equipe e líder inicial</h3></div></div><form className="form-grid" onSubmit={form.handleSubmit((values) => create.mutate(values))}><Field label="Nome da equipe"><Input {...form.register("name")} /></Field><Field label="Identificador" error={form.formState.errors.slug?.message}><Input placeholder="minha-equipe" {...form.register("slug")} /></Field><Field label="Nome do líder"><Input {...form.register("managerName")} /></Field><Field label="E-mail do líder"><Input type="email" {...form.register("managerEmail")} /></Field><Field label="Senha temporária" error={form.formState.errors.managerTemporaryPassword?.message}><Input type="password" {...form.register("managerTemporaryPassword")} /></Field><Field label="Cor principal"><Input {...form.register("primaryColor")} /></Field><Field label="Cor secundária"><Input {...form.register("secondaryColor")} /></Field><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button loading={create.isPending}>Criar equipe</Button></div></form></Card> : null}
    {(organizations.data ?? []).length ? <div className="organization-grid">{organizations.data!.map((item) => <Card key={item.id} className="organization-card"><span className="organization-mark" style={{ background: /^#[0-9a-fA-F]{6}$/.test(item.primaryColor ?? "") ? item.primaryColor! : undefined }}><Building2 /></span><div><h3>{item.name ?? "Organização"}</h3><p>{item.slug ?? item.id}</p></div><span className={`availability ${item.status === "ACTIVE" ? "available" : "unavailable"}`}>{item.status ?? "ACTIVE"}</span><Button variant="secondary" onClick={() => update.mutate({ id: item.id, status: item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>{item.status === "ACTIVE" ? "Suspender" : "Ativar"}</Button></Card>)}</div> : <EmptyState title="Nenhuma organização cadastrada" description="Crie a primeira organização e seu manager inicial." />}
  </>;
}
