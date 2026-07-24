"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, CheckCircle2, Save, Send, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FileUploader } from "@/components/file-uploader";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { estimatePoints } from "@/features/submissions/estimate";
import { activityService, campaignService, memberService, submissionService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { formatNumber } from "@/lib/utils";

const itemSchema = z.object({
  activityItemTypeId: z.string(),
  label: z.string(),
  quantity: z.coerce.number().min(0),
  points: z.number().optional(),
});
const schema = z.object({
  campaignId: z.string().min(1, "Selecione a campanha"),
  activityId: z.string().min(1, "Selecione a atividade"),
  actionDate: z.string().min(1, "Informe a data"),
  institutionName: z.string().max(200).optional(),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().max(40).optional(),
  notes: z.string().optional(),
  participantIds: z.array(z.string()),
  items: z.array(itemSchema),
});
type Values = z.infer<typeof schema>;
type InputValues = z.input<typeof schema>;

export function NewSubmissionPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = principal?.organizationId ?? null;
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [intent, setIntent] = useState<"draft" | "submit">("draft");
  const activities = useQuery({ queryKey: queryKeys.tenant(tenant, "activities"), queryFn: activityService.list });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const members = useQuery({ queryKey: queryKeys.tenant(tenant, "members-for-submission"), queryFn: memberService.list });
  const form = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      activityId: searchParams.get("activityId") ?? "",
      campaignId: "",
      actionDate: new Date().toISOString().slice(0, 10),
      participantIds: [],
      items: [],
    },
  });
  const { fields, replace } = useFieldArray({ control: form.control, name: "items" });
  const activityId = useWatch({ control: form.control, name: "activityId" });
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const participantIds = useWatch({ control: form.control, name: "participantIds" });
  const itemValues = useWatch({ control: form.control, name: "items" });
  const activity = useMemo(() => activities.data?.find((item) => item.id === activityId), [activities.data, activityId]);

  useEffect(() => {
    if (!activity) return;
    form.setValue("campaignId", activity.campaignId ?? "");
    form.setValue("unit", activity.unit ?? "");
    const nextItems = (activity.itemTypes ?? []).filter((item) => item.id).map((item) => ({
      activityItemTypeId: item.id!,
      label: item.name ?? "Item",
      quantity: 0,
      points: item.points,
    }));
    replace(nextItems);
  }, [activity, form, replace]);

  const estimate = estimatePoints(activity, {
    quantity: typeof quantity === "number" ? quantity : Number(quantity ?? 0),
    participantCount: participantIds.length,
    items: itemValues.map((item) => ({
      quantity:
        typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 0),
      points: item.points,
    })),
  });

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const body = {
        campaignId: values.campaignId,
        activityId: values.activityId,
        actionDate: new Date(`${values.actionDate}T12:00:00`).toISOString(),
        institutionName: values.institutionName || undefined,
        quantity: values.quantity,
        unit: values.unit || undefined,
        notes: values.notes || undefined,
        participantIds: values.participantIds.length ? values.participantIds : undefined,
        items: values.items.length
          ? values.items.map(({ activityItemTypeId, quantity: itemQuantity }) => ({
              activityItemTypeId,
              quantity: itemQuantity,
            }))
          : undefined,
      };
      const created = await submissionService.create(body);
      for (const file of files) {
        const key = `${file.name}-${file.size}`;
        setProgress((current) => ({ ...current, [key]: 12 }));
        await submissionService.upload(created.id, file);
        setProgress((current) => ({ ...current, [key]: 100 }));
      }
      return intent === "submit" ? submissionService.submit(created.id) : created;
    },
    onSuccess: async (submission) => {
      toast.success(intent === "submit" ? "Ação enviada para validação" : "Rascunho salvo");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "submissions") });
      router.push(`/submissions/${submission.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (activities.isLoading || campaigns.isLoading || members.isLoading) return <LoadingState />;
  if (activities.error || campaigns.error || members.error) return <ErrorState error={activities.error ?? campaigns.error ?? members.error} />;

  return (
    <>
      <Link href="/activities" className="back-link"><ArrowLeft size={16} /> Voltar para atividades</Link>
      <PageHeading eyebrow="Novo registro" title="Conte como essa ação aconteceu" description="Você pode salvar um rascunho e continuar depois. A pontuação só se torna oficial após validação." />
      <form className="submission-layout" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <div className="submission-main">
          <Card className="form-section">
            <div className="section-number">1</div>
            <div className="section-content">
              <h3>Sobre a ação</h3><p>Comece escolhendo a atividade e quando ela aconteceu.</p>
              <div className="form-grid two-columns">
                <Field label="Atividade" error={form.formState.errors.activityId?.message}>
                  <select className="input" {...form.register("activityId")}><option value="">Selecione</option>{(activities.data ?? []).filter((item) => item.status !== "INACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                </Field>
                <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
                  <select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                </Field>
                <Field label="Data da ação" error={form.formState.errors.actionDate?.message}><Input type="date" max={new Date().toISOString().slice(0, 10)} {...form.register("actionDate")} /></Field>
                <Field label="Instituição beneficiada"><Input placeholder="Nome da instituição" {...form.register("institutionName")} /></Field>
              </div>
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-number">2</div>
            <div className="section-content">
              <h3>Detalhes da contribuição</h3><p>Informe as quantidades conforme a regra da atividade.</p>
              {activity?.scoringType === "PER_ITEM" && fields.length ? (
                <div className="dynamic-items">
                  {fields.map((field, index) => (
                    <Field key={field.id} label={field.label}>
                      <Input type="number" min="0" step="0.1" {...form.register(`items.${index}.quantity`)} />
                    </Field>
                  ))}
                </div>
              ) : (
                <div className="form-grid two-columns">
                  <Field label="Quantidade"><Input type="number" min="0" step="0.1" {...form.register("quantity")} /></Field>
                  <Field label="Unidade"><Input placeholder="kg, itens, kits…" {...form.register("unit")} /></Field>
                </div>
              )}
              <div className="estimate-box">
                <Calculator />
                <div><span>Prévia estimada</span><strong>{estimate === null ? "Calculada pela validação" : `${formatNumber(estimate)} pontos`}</strong><small>Estimativa informativa; a pontuação oficial é definida pela API após análise.</small></div>
              </div>
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-number">3</div>
            <div className="section-content">
              <h3>Quem participou</h3><p>Reconheça as pessoas que fizeram parte da ação.</p>
              <Controller
                name="participantIds"
                control={form.control}
                render={({ field }) => (
                  <div className="participant-grid">
                    {(members.data ?? []).map((member) => {
                      const selected = field.value.includes(member.id);
                      return (
                        <button type="button" key={member.id} className={`participant-chip ${selected ? "selected" : ""}`} onClick={() => field.onChange(selected ? field.value.filter((id) => id !== member.id) : [...field.value, member.id])}>
                          <span><Users size={15} /></span>
                          <div><strong>{member.user?.name ?? member.name ?? member.user?.email ?? member.email ?? "Participante"}</strong><small>{member.role ?? "MEMBER"}</small></div>
                          {selected ? <CheckCircle2 size={17} /> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-number">4</div>
            <div className="section-content">
              <h3>Evidências e observações</h3><p>Anexe registros que ajudem a contar e validar a história.</p>
              <FileUploader files={files} onChange={setFiles} progress={progress} />
              <Field label="Observações"><textarea className="input" placeholder="Contexto, detalhes ou algo importante para a validação…" {...form.register("notes")} /></Field>
            </div>
          </Card>
        </div>
        <aside className="submission-side">
          <Card className="submission-summary">
            <p className="eyebrow">Resumo</p>
            <h3>{activity?.name ?? "Escolha uma atividade"}</h3>
            <dl>
              <div><dt>Pontuação estimada</dt><dd>{estimate === null ? "—" : formatNumber(estimate)}</dd></div>
              <div><dt>Participantes</dt><dd>{participantIds.length}</dd></div>
              <div><dt>Evidências</dt><dd>{files.length}</dd></div>
            </dl>
            <p className="summary-note">Seu registro ficará como rascunho até você escolher enviar para validação.</p>
            <Button type="submit" variant="secondary" loading={save.isPending && intent === "draft"} onClick={() => setIntent("draft")}><Save size={17} /> Salvar rascunho</Button>
            <Button type="submit" loading={save.isPending && intent === "submit"} onClick={() => setIntent("submit")}><Send size={17} /> Enviar para validação</Button>
          </Card>
        </aside>
      </form>
    </>
  );
}
