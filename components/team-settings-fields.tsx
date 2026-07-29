"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { HEX_COLOR } from "@/components/team-brand-provider";

export function ColorPickerField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const valid = HEX_COLOR.test(value);
  return (
    <Field
      label={label}
      error={!valid ? "Use o formato hexadecimal #RRGGBB." : undefined}
    >
      <div className="color-input">
        <input
          type="color"
          aria-label={`${label}: seletor visual`}
          value={valid ? value : "#0D7555"}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          value={value}
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
    </Field>
  );
}

export function TeamLogoUploader({
  disabled,
  currentLogo,
  loading,
  onChange,
}: {
  disabled?: boolean;
  currentLogo?: string | null;
  loading?: boolean;
  onChange?: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const select = (next: File | null) => {
    setError("");
    if (next && !["image/png", "image/jpeg", "image/webp"].includes(next.type)) {
      setError("Escolha uma imagem PNG, JPEG ou WebP.");
      return;
    }
    if (next && next.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    setFile(next);
    if (next) onChange?.(next);
  };

  return (
    <div className="team-logo-uploader">
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => select(event.target.files?.[0] ?? null)}
      />
      <div className="logo-drop">
        {currentLogo ? (
          // A URL assinada é temporária e não deve passar pelo cache do otimizador.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="team-logo-preview" src={currentLogo} alt="Logo atual da equipe" />
        ) : <ImageUp aria-hidden />}
        <strong>{file?.name ?? "Logo da equipe"}</strong>
        <span>PNG, JPEG ou WebP, até 5 MB.</span>
        <Button type="button" variant="secondary" disabled={disabled} loading={loading} onClick={() => input.current?.click()}>
          {file ? "Substituir imagem" : "Escolher imagem"}
        </Button>
        {file ? (
          <Button type="button" variant="ghost" disabled={disabled || loading} onClick={() => setFile(null)}>
            <Trash2 size={15} /> Remover seleção
          </Button>
        ) : null}
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}
