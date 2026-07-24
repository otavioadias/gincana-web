"use client";

import { ImageUp, Info, Palette, Save } from "lucide-react";
import { useState } from "react";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";

const safeHex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function SettingsPage() {
  const { principal } = useSession();
  const [name, setName] = useState("Minha organização");
  const [primary, setPrimary] = useState("#0d7555");
  const [secondary, setSecondary] = useState("#e9a62b");
  const safePrimary = safeHex.test(primary) ? primary : "#0d7555";
  const safeSecondary = safeHex.test(secondary) ? secondary : "#e9a62b";
  return <>
    <PageHeading eyebrow="Identidade visual" title="Configurações da organização" description="Pré-visualize cores e marca em um ambiente seguro." />
    <div className="settings-grid">
      <Card className="settings-form"><div className="card-heading"><div><p className="eyebrow">Marca</p><h3>Informações e cores</h3></div></div>
        <div className="contract-notice"><Info size={17} /><p>A API atual não oferece uma rota de configuração para MANAGER e o retorno de <code>/me</code> não inclui marca ou cores. A prévia abaixo não é enviada para evitar um contrato incompatível.</p></div>
        <Field label="Nome da organização"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <div className="color-fields"><Field label="Cor principal"><div className="color-input"><input type="color" value={safePrimary} onChange={(event) => setPrimary(event.target.value)} /><Input value={primary} onChange={(event) => setPrimary(event.target.value)} /></div></Field><Field label="Cor secundária"><div className="color-input"><input type="color" value={safeSecondary} onChange={(event) => setSecondary(event.target.value)} /><Input value={secondary} onChange={(event) => setSecondary(event.target.value)} /></div></Field></div>
        <div className="logo-drop"><ImageUp /><strong>Logo da organização</strong><span>O upload será habilitado quando o gincana-api publicar a rota correspondente.</span></div>
        <Button disabled><Save size={17} /> Salvar identidade</Button>
      </Card>
      <Card className="theme-preview" style={{ "--preview-primary": safePrimary, "--preview-secondary": safeSecondary } as React.CSSProperties}>
        <div className="preview-label"><Palette size={15} /> Pré-visualização segura</div>
        <div className="preview-header"><span className="preview-logo">{name.slice(0, 1).toUpperCase()}</span><strong>{name}</strong></div>
        <div className="preview-body"><p>Olá, {principal?.email.split("@")[0]}!</p><h3>Juntos, já transformamos muito.</h3><div className="preview-impact"><span>Impacto aprovado</span><strong>1.280 pontos</strong><i /></div><button>Registrar uma ação</button></div>
      </Card>
    </div>
  </>;
}
