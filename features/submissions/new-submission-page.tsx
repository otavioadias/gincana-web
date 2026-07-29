"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calculator, Info, Save, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FileUploader } from "@/components/file-uploader";
import { ParticipantSelector } from "@/components/participant-selector";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { ErrorState, LoadingState, PermissionState } from "@/components/states";
import { activityAvailability } from "@/features/activities/availability";
import { useSession } from "@/features/auth/session-provider";
import { estimatePoints } from "@/features/submissions/estimate";
import {
  minimumParticipantCount,
  submissionBlockers,
} from "@/features/submissions/validation";
import { isPermissionError, translateApiError } from "@/lib/api-client";
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
type SaveIntent = "draft" | "submit";

export function NewSubmissionPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = principal?.organizationId ?? null;
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const draftId = useRef<string | null>(null);
  const uploadedFiles = useRef(new Set<string>());
  const activities = useQuery({
    queryKey: queryKeys.tenant(tenant, "activities"),
    queryFn: () => activityService.list(),
  });
  const campaigns = useQuery({ queryKey: queryKeys.tenant(tenant, "campaigns"), queryFn: campaignService.list });
  const participants = useQuery({
    queryKey: queryKeys.tenant(tenant, "submission-participants"),
    queryFn: memberService.participants,
  });
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
  const actionDate = useWatch({ control: form.control, name: "actionDate" });
  const itemValues = useWatch({ control: form.control, name: "items" });
  const activity = useMemo(() => activities.data?.find((item) => item.id === activityId), [activities.data, activityId]);
  const availability = activity ? activityAvailability(activity) : null;
  const campaign = campaigns.data?.find((item) => item.id === activity?.campaignId);

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

  useEffect(() => {
    if (
      principal?.membershipId &&
      participantIds.length === 0 &&
      participants.data?.some((member) => member.id === principal.membershipId)
    ) {
      form.setValue("participantIds", [principal.membershipId]);
    }
  }, [form, participantIds.length, participants.data, principal?.membershipId]);

  const estimate = estimatePoints(activity, {
    quantity: typeof quantity === "number" ? quantity : Number(quantity ?? 0),
    participantCount: participantIds.length,
    items: itemValues.map((item) => ({
      quantity:
        typeof item.quantity === "number" ? item.quantity : Number(item.quantity ?? 0),
      points: item.points,
    })),
  });
  const blockers = submissionBlockers({
    activity,
    campaign,
    actionDate,
    quantity: typeof quantity === "number" ? quantity : Number(quantity ?? 0),
    itemQuantities: itemValues.map((item) => Number(item.quantity ?? 0)),
    participantCount: participantIds.length,
    activeParticipantCount: participants.data?.length ?? 0,
  });
  const minimumParticipants = minimumParticipantCount(
    activity,
    participants.data?.length ?? 0,
  );

  const save = useMutation({
    mutationFn: async ({ values, intent }: { values: Values; intent: SaveIntent }) => {
      const body = {
        campaignId: values.campaignId,
        activityId: values.activityId,
        actionDate: new Date(`${values.actionDate}T12:00:00`).toISOString(),
        institutionName: values.institutionName || undefined,
        quantity: values.quantity,
        unit: values.unit || undefined,
        notes: values.notes || undefined,
        participantIds: values.participantIds,
        items: values.items.map(({ activityItemTypeId, quantity: itemQuantity }) => ({
          activityItemTypeId,
          quantity: itemQuantity,
        })),
      };
      const draft = draftId.current
        ? await submissionService.update(draftId.current, body)
        : await submissionService.create(body);
      draftId.current = draft.id;

      for (const file of files) {
        const key = `${file.name}-${file.size}`;
        if (uploadedFiles.current.has(key)) continue;
        setProgress((current) => ({ ...current, [key]: 12 }));
        await submissionService.upload(draft.id, file);
        uploadedFiles.current.add(key);
        setProgress((current) => ({ ...current, [key]: 100 }));
      }
      return intent === "submit" ? submissionService.submit(draft.id) : draft;
    },
    onSuccess: async (submission, variables) => {
      const sent = variables.intent === "submit";
      toast.success(sent ? "Ação enviada para validação" : "Rascunho salvo");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "submissions") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "my-submissions") }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tenant(tenant, "activities") }),
      ]);
      router.push(`/submissions/${submission.id}`);
    },
    onError: (error) => {
      const prefix = draftId.current ? "O rascunho foi preservado. " : "";
      toast.error(`${prefix}${translateApiError(error, "Não foi possível salvar a ação")}`);
    },
  });

  if (activities.isLoading || campaigns.isLoading || participants.isLoading) return <LoadingState />;
  const loadingError = activities.error ?? campaigns.error ?? participants.error;
  if (loadingError) {
    if (isPermissionError(loadingError)) return <PermissionState />;
    return <ErrorState error={translateApiError(loadingError)} retry={() => void Promise.all([activities.refetch(), campaigns.refetch(), participants.refetch()])} />;
  }

  const submitWith = (intent: SaveIntent) => {
    if (intent === "submit" && activity?.evidenceRequired && files.length === 0) {
      toast.error("Adicione pelo menos uma evidência antes de enviar para validação.");
      return;
    }
    if (intent === "submit" && blockers.length) {
      toast.error(blockers[0]);
      return;
    }
    return form.handleSubmit((values) => save.mutate({ values, intent }))();
  };

  return (
    <>
      <Link href="/activities" className="back-link"><ArrowLeft size={16} /> Voltar para atividades</Link>
      <PageHeading eyebrow="Novo registro" title="Conte como essa ação aconteceu" description="Você pode salvar um rascunho e continuar depois. A pontuação só se torna oficial após validação." />
      <form className="submission-layout" onSubmit={form.handleSubmit((values) => save.mutate({ values, intent: "draft" }))}>
        <div className="submission-main">
          <Card className="form-section">
            <div className="section-number">1</div>
            <div className="section-content">
              <h3>Sobre a ação</h3><p>Comece escolhendo a atividade e quando ela aconteceu.</p>
              <div className="form-grid two-columns">
                <Field label="Atividade" error={form.formState.errors.activityId?.message}>
                  <select className="input" {...form.register("activityId")}><option value="">Selecione</option>{(activities.data ?? []).filter((item) => item.status !== "INACTIVE").map((item) => <option key={item.id} value={item.id} disabled={item.availability?.available === false}>{item.name}{item.availability?.available === false ? " — indisponível" : ""}</option>)}</select>
                </Field>
                <Field label="Campanha" error={form.formState.errors.campaignId?.message}>
                  <select className="input" {...form.register("campaignId")}><option value="">Selecione</option>{(campaigns.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                </Field>
                <Field label="Data da ação" error={form.formState.errors.actionDate?.message}>
                  <Input
                    type="date"
                    min={campaign?.startsAt?.slice(0, 10)}
                    max={[
                      campaign?.endsAt?.slice(0, 10),
                      new Date().toISOString().slice(0, 10),
                    ].filter(Boolean).sort()[0]}
                    {...form.register("actionDate")}
                  />
                </Field>
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
              {activity?.scoringType === "PER_COMPLETE_KIT" ? (
                <p className="supportive-copy">
                  Quantidade informada: {Number(quantity ?? 0)} kit(s) completo(s). A composição interna
                  dos kits não está estruturada no contrato atual.
                </p>
              ) : null}
              {activity?.name?.toLocaleLowerCase("pt-BR").includes("conexão com idosos") ? (
                <div className="contract-notice">
                  <Info size={17} />
                  <p>
                    A duração ainda não pode ser enviada: <code>details.durationMinutes</code> não existe
                    em <code>CreateSubmissionDto</code>.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-number">3</div>
            <div className="section-content">
              <h3>Quem participou</h3>
              <p>
                {minimumParticipants > 0
                  ? `Esta ação exige ao menos ${minimumParticipants} participante(s), conforme o percentual da equipe ativa.`
                  : "Reconheça as pessoas que fizeram parte da ação."}
              </p>
              <Controller
                name="participantIds"
                control={form.control}
                render={({ field }) => (
                  <ParticipantSelector
                    participants={participants.data ?? []}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-number">4</div>
            <div className="section-content">
              <h3>Evidências e observações</h3><p>{activity?.evidenceRequired ? "Anexe pelo menos uma evidência para enviar à validação." : "Anexe registros que ajudem a contar e validar a história."}</p>
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
            {availability && !availability.available ? <p className="limit-reason">{availability.reason}</p> : null}
            {blockers.length ? (
              <div className="submission-blockers" role="alert">
                <strong>Antes de enviar</strong>
                <ul>{blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
            ) : null}
            <p className="contract-footnote">
              A API atual informa disponibilidade na listagem, sem consulta por data. O servidor valida
              novamente os limites no envio.
            </p>
            <p className="summary-note">Seu registro ficará como rascunho até você escolher enviar para validação.</p>
            <Button type="button" variant="secondary" loading={save.isPending && save.variables?.intent === "draft"} onClick={() => void submitWith("draft")}><Save size={17} /> Salvar rascunho</Button>
            <Button type="button" disabled={blockers.length > 0} loading={save.isPending && save.variables?.intent === "submit"} onClick={() => void submitWith("submit")}><Send size={17} /> Enviar para validação</Button>
          </Card>
        </aside>
      </form>
    </>
  );
}
