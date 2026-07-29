"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/feedback";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { campaignService } from "@/lib/services";
import { appRole, type Campaign } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "ARCHIVED"]),
  minimumActionsPerMonth: z.coerce.number().min(0),
}).refine((value) => value.endsAt >= value.startsAt, {
  path: ["endsAt"],
  message: "A data final deve ser posterior à inicial",
});
type Values = z.infer<typeof schema>;
type InputValues = z.input<typeof schema>;

const defaults: InputValues = {
  name: "",
  description: "",
  startsAt: "",
  endsAt: "",
  status: "DRAFT",
  minimumActionsPerMonth: 1,
};

export function CampaignsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const role = appRole(principal);
  const canManage = role === "SUPER_ADMIN";
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);
  const campaigns = useQuery({
    queryKey: queryKeys.tenant(tenant, "campaigns"),
    queryFn: campaignService.list,
  });
  const detail = useQuery({
    queryKey: queryKeys.tenant(null, "campaign-detail", editingId),
    queryFn: () => campaignService.get(editingId),
    enabled: Boolean(editingId),
  });
  const form = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  useEffect(() => {
    if (!detail.data) return;
    form.reset({
      name: detail.data.name ?? "",
      description: detail.data.description ?? "",
      startsAt: detail.data.startsAt?.slice(0, 10) ?? "",
      endsAt: detail.data.endsAt?.slice(0, 10) ?? "",
      status: detail.data.status ?? "DRAFT",
      minimumActionsPerMonth: detail.data.minimumActionsPerMonth ?? 1,
    });
  }, [detail.data, form]);

  const refresh = () => queryClient.invalidateQueries({
    queryKey: queryKeys.tenantResource(tenant, "campaigns"),
  });
  const save = useMutation({
    mutationFn: (values: Values) => editingId
      ? campaignService.update(editingId, values)
      : campaignService.create(values),
    onSuccess: async () => {
      toast.success(editingId ? "Campanha atualizada" : "Campanha criada");
      setEditingId("");
      setShowForm(false);
      form.reset(defaults);
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível salvar a campanha")),
  });
  const remove = useMutation({
    mutationFn: campaignService.remove,
    onSuccess: async () => {
      toast.success("Campanha arquivada");
      setPendingDelete(null);
      await refresh();
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível arquivar a campanha")),
  });

  const openCreate = () => {
    setEditingId("");
    form.reset(defaults);
    setShowForm((value) => !value);
  };
  const closeForm = () => {
    setEditingId("");
    setShowForm(false);
    form.reset(defaults);
  };

  if (campaigns.isLoading) return <LoadingState />;
  if (campaigns.error) return <ErrorState error={campaigns.error} retry={() => void campaigns.refetch()} />;

  return (
    <>
      <PageHeading
        eyebrow={canManage ? "Administração global" : "Ciclos de mobilização"}
        title="Campanhas"
        description={canManage
          ? "Crie e gerencie os ciclos globais usados por todas as equipes."
          : "Consulte os períodos, o propósito e o ritmo de participação definidos pela plataforma."}
        action={canManage ? <Button onClick={openCreate}><Plus size={17} /> Nova campanha</Button> : undefined}
      />
      {showForm && canManage ? (
        <Card className="inline-form-card">
          <div className="card-heading">
            <div><p className="eyebrow">Configuração global</p><h3>{editingId ? "Editar campanha" : "Nova campanha"}</h3></div>
          </div>
          {editingId && detail.isLoading ? <LoadingState label="Carregando campanha…" /> : null}
          {editingId && detail.error ? <ErrorState error={detail.error} retry={() => void detail.refetch()} /> : null}
          {!editingId || detail.data ? (
            <form
              className="form-grid"
              onSubmit={form.handleSubmit((values) => save.mutate({
                ...values,
                description: values.description || undefined,
              }))}
            >
              <Field label="Nome" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
              <Field label="Data inicial"><Input type="date" {...form.register("startsAt")} /></Field>
              <Field label="Data final" error={form.formState.errors.endsAt?.message}><Input type="date" {...form.register("endsAt")} /></Field>
              <Field label="Mínimo de ações por mês"><Input type="number" min="0" {...form.register("minimumActionsPerMonth")} /></Field>
              <Field label="Status">
                <select className="input" {...form.register("status")}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="CLOSED">Encerrada</option>
                  <option value="ARCHIVED">Arquivada</option>
                </select>
              </Field>
              <Field label="Descrição"><textarea className="input" {...form.register("description")} /></Field>
              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
                <Button loading={save.isPending}>{editingId ? "Salvar campanha" : "Criar campanha"}</Button>
              </div>
            </form>
          ) : null}
        </Card>
      ) : null}
      {(campaigns.data ?? []).length ? (
        <div className="campaign-grid">
          {campaigns.data!.map((item) => (
            <Card key={item.id} className="campaign-card">
              <div className="campaign-icon"><CalendarRange /></div>
              <span className="soft-label">{item.status ?? "DRAFT"}</span>
              <h3>{item.name ?? "Campanha"}</h3>
              <p>{item.description ?? "Um novo ciclo de impacto coletivo."}</p>
              <div className="campaign-period">
                <span>{formatDate(item.startsAt)}</span><i /><span>{formatDate(item.endsAt)}</span>
              </div>
              <small className="muted-copy">Mínimo mensal: {item.minimumActionsPerMonth ?? 0} ações</small>
              {canManage ? (
                <div className="management-actions">
                  <Button type="button" variant="secondary" onClick={() => {
                    setEditingId(item.id);
                    setShowForm(true);
                  }}>
                    <Pencil size={15} /> Editar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPendingDelete(item)}>
                    <Trash2 size={15} /> Arquivar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma campanha criada"
          description={canManage ? "Crie o primeiro ciclo global." : "A plataforma ainda não publicou uma campanha."}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Arquivar esta campanha?"
        description="O endpoint de exclusão preservará o histórico e alterará o status para arquivada."
        confirmLabel="Arquivar campanha"
        destructive
        loading={remove.isPending}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </>
  );
}
