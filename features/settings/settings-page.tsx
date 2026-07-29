"use client";

import { Info, Palette, Save } from "lucide-react";
import { useState } from "react";
import { ColorPickerField, TeamLogoUploader } from "@/components/team-settings-fields";
import { HEX_COLOR, teamBrandVariables } from "@/components/team-brand-provider";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";
import { appRole } from "@/lib/types";

export function SettingsPage() {
  const { principal } = useSession();
  const role = appRole(principal);
  const canEdit = role === "MANAGER";
  const [name, setName] = useState("Minha equipe");
  const [primary, setPrimary] = useState("#0D7555");
  const [secondary, setSecondary] = useState("#E9A62B");
  const validColors = HEX_COLOR.test(primary) && HEX_COLOR.test(secondary);
  const previewVariables = {
    ...teamBrandVariables({ primaryColor: primary, secondaryColor: secondary }),
    "--preview-primary": validColors ? primary : "#0D7555",
    "--preview-secondary": validColors ? secondary : "#E9A62B",
  } as React.CSSProperties;

  return (
    <>
      <PageHeading
        eyebrow="Identidade visual"
        title="Configurações da equipe"
        description={
          canEdit
            ? "Prepare a identidade da equipe e visualize o resultado em tempo real."
            : "Consulte a identidade visual da sua equipe."
        }
      />
      <div className="settings-grid">
        <Card className="settings-form">
          <div className="card-heading">
            <div><p className="eyebrow">Marca</p><h3>Informações e cores</h3></div>
          </div>
          <div className="contract-notice" role="note">
            <Info size={17} />
            <p>
              O OpenAPI atual não publica <code>/team-settings</code> nem retorna marca em <code>/me</code>.
              A edição abaixo é somente uma prévia e não é persistida para evitar uma integração incompatível.
            </p>
          </div>
          <Field label="Nome da equipe">
            <Input value={name} disabled={!canEdit} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="color-fields">
            <ColorPickerField label="Cor primária" value={primary} disabled={!canEdit} onChange={setPrimary} />
            <ColorPickerField label="Cor secundária" value={secondary} disabled={!canEdit} onChange={setSecondary} />
          </div>
          <TeamLogoUploader disabled />
          <Button disabled>
            <Save size={17} /> Salvar identidade
          </Button>
          <p className="contract-footnote">
            O botão permanece desabilitado até os endpoints oficiais de tema e logo estarem documentados.
          </p>
        </Card>

        <Card className="theme-preview" style={previewVariables}>
          <div className="preview-label"><Palette size={15} /> Pré-visualização em tempo real</div>
          <div className="preview-header">
            <span className="preview-logo">{name.trim().slice(0, 1).toUpperCase() || "E"}</span>
            <strong>{name || "Equipe"}</strong>
          </div>
          <div className="preview-body">
            <p>Olá, {principal?.email.split("@")[0]}!</p>
            <h3>Juntos, já transformamos muito.</h3>
            <div className="preview-impact">
              <span>Impacto aprovado</span>
              <strong>1.280 pontos</strong>
              <i />
            </div>
            <button type="button">Registrar uma ação</button>
          </div>
        </Card>
      </div>
    </>
  );
}
