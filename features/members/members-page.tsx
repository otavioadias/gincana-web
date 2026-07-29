"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, KeyRound, Plus, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { memberService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import type { MembershipRole } from "@/lib/types";
import { initials } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(3, "Informe o nome"),
  email: z.email("Informe um e-mail válido"),
  role: z.enum(["MANAGER", "MEMBER"]),
  temporaryPassword: z.string().min(6, "Use pelo menos 6 caracteres"),
});
type Values = z.infer<typeof schema>;
const roleLabels: Record<MembershipRole, string> = { MANAGER: "Líder", MEMBER: "Participante" };

export function MembersPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const [showForm, setShowForm] = useState(false);
  const members = useQuery({ queryKey: queryKeys.tenant(tenant, "members"), queryFn: memberService.list });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: "MEMBER" } });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "members") });
  const create = useMutation({
    mutationFn: memberService.create,
    onSuccess: async () => { toast.success("Pessoa adicionada à equipe"); form.reset({ role: "MEMBER" }); setShowForm(false); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) => memberService.update(id, body),
    onSuccess: async () => { toast.success("Acesso atualizado"); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  if (members.isLoading) return <LoadingState />;
  if (members.error) return <ErrorState error={members.error} retry={() => void members.refetch()} />;
  return (
    <>
      <PageHeading eyebrow="Pessoas que fazem acontecer" title="Equipe" description="Líderes participam das ações, convidam integrantes e podem tornar outras pessoas líderes." action={<Button onClick={() => setShowForm((value) => !value)}><Plus size={17} /> Adicionar pessoa</Button>} />
      {showForm ? <Card className="inline-form-card"><div className="card-heading"><div><p className="eyebrow">Novo acesso</p><h3>Adicionar à equipe</h3></div></div><form className="form-grid" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
        <Field label="Nome" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
        <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register("email")} /></Field>
        <Field label="Perfil"><select className="input" {...form.register("role")}><option value="MEMBER">Participante</option><option value="MANAGER">Líder</option></select></Field>
        <Field label="Senha temporária" error={form.formState.errors.temporaryPassword?.message}><Input type="password" {...form.register("temporaryPassword")} /></Field>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button><Button loading={create.isPending}>Criar acesso</Button></div>
      </form></Card> : null}
      {(members.data ?? []).length ? <Card className="people-card">
        {(members.data ?? []).map((member) => {
          const name = member.user?.name ?? member.name ?? member.user?.email ?? member.email ?? "Pessoa da equipe";
          const email = member.user?.email ?? member.email ?? "—";
          const status = member.status ?? member.user?.status ?? "ACTIVE";
          return <div className="person-row" key={member.id}>
            <span className="avatar person-avatar">{initials(name)}</span>
            <div className="person-main"><strong>{name}</strong><span>{email}</span></div>
            <span className="role-pill">{member.role === "MANAGER" ? <ShieldCheck size={13} /> : <UserRound size={13} />}{member.role ? roleLabels[member.role] : "Participante"}</span>
            <span className={`availability ${status === "ACTIVE" ? "available" : "unavailable"}`}>{status === "ACTIVE" ? "Ativo" : "Bloqueado"}</span>
            <div className="person-actions">
              <Button variant="ghost" title="Redefinir acesso" onClick={() => {
                const temporaryPassword = window.prompt("Digite uma nova senha temporária (mínimo 6 caracteres):");
                if (temporaryPassword) update.mutate({ id: member.id, body: { temporaryPassword } });
              }}><KeyRound size={16} /></Button>
              <Button variant="ghost" title={status === "ACTIVE" ? "Bloquear acesso" : "Reativar acesso"} onClick={() => update.mutate({ id: member.id, body: { status: status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } })}><Ban size={16} /></Button>
            </div>
          </div>;
        })}
      </Card> : <EmptyState title="Monte sua equipe" description="Adicione a primeira pessoa para começar a registrar ações em conjunto." />}
    </>
  );
}
