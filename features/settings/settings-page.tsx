"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback";
import { ColorPickerField, TeamLogoUploader } from "@/components/team-settings-fields";
import { HEX_COLOR, teamBrandVariables } from "@/components/team-brand-provider";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/states";
import { useSession } from "@/features/auth/session-provider";
import { translateApiError } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { teamSettingsService } from "@/lib/services";
import { appRole, type TeamProfile } from "@/lib/types";

export function SettingsPage() {
  const { principal } = useSession();
  const queryClient = useQueryClient();
  const tenant = principal?.organizationId ?? null;
  const canEdit = appRole(principal) === "MANAGER";
  const [primaryDraft, setPrimaryDraft] = useState<string | null>(null);
  const [secondaryDraft, setSecondaryDraft] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const settingsKey = queryKeys.tenant(tenant, "team-settings");
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: teamSettingsService.get,
  });

  const primary = primaryDraft ?? settings.data?.primaryColor ?? "";
  const secondary = secondaryDraft ?? settings.data?.secondaryColor ?? "";

  const updateCache = (profile: TeamProfile) =>
    queryClient.setQueryData(settingsKey, profile);
  const theme = useMutation({
    mutationFn: teamSettingsService.updateTheme,
    onSuccess: (profile) => {
      updateCache(profile);
      setPrimaryDraft(profile.primaryColor);
      setSecondaryDraft(profile.secondaryColor);
      toast.success("Cores da equipe atualizadas");
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível salvar as cores")),
  });
  const logo = useMutation({
    mutationFn: teamSettingsService.uploadLogo,
    onSuccess: (profile) => {
      updateCache(profile);
      toast.success("Logo da equipe atualizado");
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível enviar o logo")),
  });
  const removeLogo = useMutation({
    mutationFn: teamSettingsService.removeLogo,
    onSuccess: async () => {
      setConfirmRemove(false);
      toast.success("Logo removido");
      await queryClient.invalidateQueries({ queryKey: settingsKey });
    },
    onError: (error) => toast.error(translateApiError(error, "Não foi possível remover o logo")),
  });

  if (settings.isLoading) return <LoadingState label="Carregando identidade da equipe…" />;
  if (settings.error || !settings.data) {
    return <ErrorState error={settings.error} retry={() => void settings.refetch()} />;
  }

  const profile = settings.data;
  const validColors = HEX_COLOR.test(primary) && HEX_COLOR.test(secondary);
  const changed =
    primary !== profile.primaryColor || secondary !== profile.secondaryColor;
  const previewVariables = {
    ...teamBrandVariables({ primaryColor: primary, secondaryColor: secondary }),
    "--preview-primary": validColors ? primary : profile.primaryColor,
    "--preview-secondary": validColors ? secondary : profile.secondaryColor,
  } as React.CSSProperties;

  return (
    <>
      <PageHeading
        eyebrow="Identidade visual"
        title="Configurações da equipe"
        description={canEdit ? "Personalize a marca aplicada em toda a plataforma." : "Consulte a identidade visual da sua equipe."}
      />
      <div className="settings-grid">
        <Card className="settings-form">
          <div className="card-heading">
            <div><p className="eyebrow">Marca</p><h3>Informações e cores</h3></div>
          </div>
          <Field label="Nome da equipe" hint="O nome é administrado pelo cadastro da organização.">
            <Input value={profile.name} disabled />
          </Field>
          <div className="color-fields">
            <ColorPickerField label="Cor primária" value={primary} disabled={!canEdit} onChange={setPrimaryDraft} />
            <ColorPickerField label="Cor secundária" value={secondary} disabled={!canEdit} onChange={setSecondaryDraft} />
          </div>
          {canEdit ? (
            <Button
              disabled={!validColors || !changed}
              loading={theme.isPending}
              onClick={() => theme.mutate({ primaryColor: primary, secondaryColor: secondary })}
            >
              <Save size={17} /> Salvar cores
            </Button>
          ) : null}
          <TeamLogoUploader
            currentLogo={profile.logoUrl}
            disabled={!canEdit}
            loading={logo.isPending}
            onSave={(file) => logo.mutateAsync(file).then(() => undefined)}
          />
          {canEdit && profile.hasLogo ? (
            <Button variant="danger" onClick={() => setConfirmRemove(true)}>
              <Trash2 size={16} /> Remover logo
            </Button>
          ) : null}
        </Card>

        <Card className="theme-preview" style={previewVariables}>
          <div className="preview-label"><Palette size={15} /> Pré-visualização em tempo real</div>
          <div className="preview-header">
            {profile.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="preview-logo-image" src={profile.logoUrl} alt="" />
            ) : <span className="preview-logo">{profile.name.slice(0, 1).toUpperCase()}</span>}
            <strong>{profile.name}</strong>
          </div>
          <div className="preview-body">
            <p>Olá, {principal?.email.split("@")[0]}!</p>
            <h3>Juntos, já transformamos muito.</h3>
            <div className="preview-impact">
              <span>Impacto aprovado</span><strong>1.280 pontos</strong><i />
            </div>
            <button type="button">Registrar uma ação</button>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmRemove}
        title="Remover o logo?"
        description="A equipe voltará a usar a identificação textual até que outro logo seja enviado."
        confirmLabel="Remover logo"
        destructive
        loading={removeLogo.isPending}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => removeLogo.mutate()}
      />
    </>
  );
}
