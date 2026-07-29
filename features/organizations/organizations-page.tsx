"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Gauge, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/feedback";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { organizationService } from "@/lib/services";
import type { Organization } from "@/lib/types";

const createSchema = z.object({
  name: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  managerName: z.string().min(3),
  managerEmail: z.email(),
  managerTemporaryPassword: z.string().min(6),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
});
const editSchema = z.object({
  name: z.string().min(3),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});
type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Organization | null>(null);
  const organizations = useQuery({
    queryKey: queryKeys.tenant(null, "organizations"),
    queryFn: organizationService.list,
  });
  const detail = useQuery({
    queryKey: queryKeys.tenant(null, "organization-detail", editingId),
    queryFn: () => organizationService.get(editingId),
    enabled: Boolean(editingId),
  });
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { primaryColor: "#0d7555", secondaryColor: "#e9a62b" },
  });
  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) });
  useEffect(() => {
    if (!detail.data) return;
    editForm.reset({
      name: detail.data.name ?? "",
      slug: detail.data.slug ?? "",
      primaryColor: detail.data.primaryColor ?? "#0d7555",
      secondaryColor: detail.data.secondaryColor ?? "#e9a62b",
      status: detail.data.status ?? "ACTIVE",
    });
  }, [detail.data, editForm]);

  const refresh = () => queryClient.invalidateQueries({
    queryKey: queryKeys.tenantResource(null, "organizations"),
  });
  const create = useMutation({
    mutationFn: organizationService.create,
    onSuccess: async () => {
      toast.success("Equipe e líder inicial criados");
      createForm.reset({ primaryColor: "#0d7555", secondaryColor: "#e9a62b" });
      setShowCreate(false);
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível criar a equipe")),
  });
  const update = useMutation({
    mutationFn: (values: EditValues) => organizationService.update(editingId, values),
    onSuccess: async () => {
      toast.success("Equipe atualizada");
      setEditingId("");
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível atualizar a equipe")),
  });
  const remove = useMutation({
    mutationFn: organizationService.remove,
    onSuccess: async () => {
      toast.success("Equipe desativada");
      setPendingDelete(null);
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível desativar a equipe")),
  });

  if (organizations.isLoading) return <LoadingState />;
  if (organizations.error) return <ErrorState error={organizations.error} retry={() => void organizations.refetch()} />;

  return (
    <>
      <PageHeading
        eyebrow="Administração da plataforma"
        title="Equipes"
        description="Crie, edite, suspenda, reative e desative equipes sem vincular o administrador a elas."
        action={<Button onClick={() => setShowCreate((value) => !value)}><Plus size={17} /> Nova equipe</Button>}
      />
      {showCreate ? (
        <Card className="inline-form-card">
          <div className="card-heading"><div><p className="eyebrow">Cadastro</p><h3>Nova equipe e líder inicial</h3></div></div>
          <form className="form-grid" onSubmit={createForm.handleSubmit((values) => create.mutate(values))}>
            <Field label="Nome da equipe" error={createForm.formState.errors.name?.message}><Input {...createForm.register("name")} /></Field>
            <Field label="Identificador" error={createForm.formState.errors.slug?.message}><Input placeholder="minha-equipe" {...createForm.register("slug")} /></Field>
            <Field label="Nome do líder" error={createForm.formState.errors.managerName?.message}><Input {...createForm.register("managerName")} /></Field>
            <Field label="E-mail do líder" error={createForm.formState.errors.managerEmail?.message}><Input type="email" {...createForm.register("managerEmail")} /></Field>
            <Field label="Senha temporária" error={createForm.formState.errors.managerTemporaryPassword?.message}><Input type="password" {...createForm.register("managerTemporaryPassword")} /></Field>
            <Field label="Cor principal"><Input type="color" {...createForm.register("primaryColor")} /></Field>
            <Field label="Cor secundária"><Input type="color" {...createForm.register("secondaryColor")} /></Field>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button loading={create.isPending}>Criar equipe</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {(organizations.data ?? []).length ? (
        <div className="organization-grid">
          {organizations.data!.map((item) => (
            <Card key={item.id} className="organization-card">
              <span
                className="organization-mark"
                style={{ background: /^#[0-9a-f]{6}$/i.test(item.primaryColor ?? "") ? item.primaryColor! : undefined }}
              >
                <Building2 />
              </span>
              <div><h3>{item.name ?? "Organização"}</h3><p>{item.slug ?? item.id}</p></div>
              <span className={`availability ${item.status === "ACTIVE" ? "available" : "unavailable"}`}>
                {item.status ?? "ACTIVE"}
              </span>
              <div className="organization-actions">
                <Link className="button button-secondary" href="/admin/dashboard">
                  <Gauge size={15} /> Resultados
                </Link>
                <Button type="button" variant="secondary" onClick={() => setEditingId(item.id)}>
                  <Pencil size={15} /> Editar
                </Button>
                <Button type="button" variant="ghost" onClick={() => setPendingDelete(item)}>
                  <Trash2 size={15} /> Desativar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma equipe cadastrada" description="Crie a primeira equipe e seu líder inicial." />
      )}

      {editingId ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setEditingId("")}>
          <Card className="limit-dialog organization-edit-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <p className="eyebrow">Gerenciamento da equipe</p>
            <h2>Editar equipe</h2>
            {detail.isLoading ? <LoadingState label="Carregando equipe…" /> : null}
            {detail.error ? <ErrorState error={detail.error} retry={() => void detail.refetch()} /> : null}
            {detail.data ? (
              <form className="form-grid" onSubmit={editForm.handleSubmit((values) => update.mutate(values))}>
                <Field label="Nome" error={editForm.formState.errors.name?.message}><Input {...editForm.register("name")} /></Field>
                <Field label="Identificador" error={editForm.formState.errors.slug?.message}><Input {...editForm.register("slug")} /></Field>
                <Field label="Cor principal"><Input type="color" {...editForm.register("primaryColor")} /></Field>
                <Field label="Cor secundária"><Input type="color" {...editForm.register("secondaryColor")} /></Field>
                <Field label="Status">
                  <select className="input" {...editForm.register("status")}>
                    <option value="ACTIVE">Ativa</option>
                    <option value="SUSPENDED">Suspensa</option>
                    <option value="INACTIVE">Inativa</option>
                  </select>
                </Field>
                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={() => setEditingId("")}>Cancelar</Button>
                  <Button loading={update.isPending}>Salvar alterações</Button>
                </div>
              </form>
            ) : null}
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Desativar esta equipe?"
        description="O backend manterá o histórico, mas a equipe ficará inativa."
        confirmLabel="Desativar equipe"
        destructive
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
