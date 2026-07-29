"use client";

import { ImageUp, Save, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    <Field label={label} error={!valid ? "Use o formato hexadecimal #RRGGBB." : undefined}>
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

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível processar a imagem."));
    };
    image.src = url;
  });
}

export function calculateLogoDimensions(width: number, height: number, maxDimension: number) {
  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function resizeLogoFile(file: File, maxDimension: number) {
  const image = await loadImage(file);
  const dimensions = calculateLogoDimensions(image.naturalWidth, image.naturalHeight, maxDimension);
  if (dimensions.width === image.naturalWidth && dimensions.height === image.naturalHeight) return file;
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não conseguiu redimensionar a imagem.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mimeType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Não foi possível gerar o logo redimensionado.")),
      mimeType,
      0.9,
    ),
  );
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}-${canvas.width}x${canvas.height}.${extension}`, { type: mimeType });
}

export function TeamLogoUploader({
  disabled,
  currentLogo,
  loading,
  onSave,
}: {
  disabled?: boolean;
  currentLogo?: string | null;
  loading?: boolean;
  onSave: (file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const [maxDimension, setMaxDimension] = useState(512);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const resizedSize = originalSize
    ? calculateLogoDimensions(originalSize.width, originalSize.height, maxDimension)
    : null;

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const clearSelection = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
    setOriginalSize(null);
    setFile(null);
    setError("");
  };

  const select = (next: File | null) => {
    setError("");
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) {
      setError("Escolha uma imagem PNG, JPEG ou WebP.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 5 MB.");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(next);
    previewRef.current = url;
    setPreviewUrl(url);
    setFile(next);
    const image = new Image();
    image.onload = () => setOriginalSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = url;
  };

  const save = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      await onSave(await resizeLogoFile(file, maxDimension));
      clearSelection();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o logo.");
    } finally {
      setProcessing(false);
    }
  };

  const displayedLogo = previewUrl ?? currentLogo;
  return (
    <div className="team-logo-uploader">
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          select(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />
      <div className="logo-drop">
        {displayedLogo ? (
          // A URL assinada é temporária e não deve passar pelo cache do otimizador.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="team-logo-preview" src={displayedLogo} alt={file ? "Prévia do novo logo" : "Logo atual da equipe"} />
        ) : <ImageUp aria-hidden />}
        <strong>{file?.name ?? "Logo da equipe"}</strong>
        <span>PNG, JPEG ou WebP, até 5 MB.</span>
        {file ? (
          <div className="logo-resize-controls">
            <label htmlFor="logo-size">
              <span>Lado máximo do arquivo salvo</span>
              <strong>{maxDimension}px</strong>
            </label>
            <input
              id="logo-size"
              type="range"
              min="128"
              max="1024"
              step="64"
              value={maxDimension}
              disabled={disabled || loading || processing}
              onChange={(event) => setMaxDimension(Number(event.target.value))}
            />
            {originalSize && resizedSize ? (
              <small>
                Original: {originalSize.width} × {originalSize.height}px · salvo em {resizedSize.width} × {resizedSize.height}px
              </small>
            ) : null}
          </div>
        ) : null}
        <div className="logo-actions">
          <Button type="button" variant="secondary" disabled={disabled || processing} onClick={() => input.current?.click()}>
            {file ? "Escolher outra" : currentLogo ? "Substituir imagem" : "Escolher imagem"}
          </Button>
          {file ? (
            <>
              <Button type="button" loading={loading || processing} disabled={disabled} onClick={() => void save()}>
                <Save size={16} /> Redimensionar e salvar
              </Button>
              <Button type="button" variant="ghost" disabled={disabled || loading || processing} onClick={clearSelection}>
                <Trash2 size={15} /> Cancelar
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}
