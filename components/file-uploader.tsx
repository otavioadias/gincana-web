"use client";

import { FileText, Image as ImageIcon, Plus, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui";

const accepted = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const maxBytes = 10_485_760;

export function FileUploader({
  files,
  onChange,
  progress = {},
}: {
  files: File[];
  onChange: (files: File[]) => void;
  progress?: Record<string, number>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function add(next: FileList | null) {
    if (!next) return;
    setError("");
    const merged = [...files];
    for (const file of Array.from(next)) {
      if (!accepted.includes(file.type)) {
        setError(`${file.name}: formato não aceito.`);
        continue;
      }
      if (file.size > maxBytes) {
        setError(`${file.name}: o limite é 10 MB por arquivo.`);
        continue;
      }
      if (merged.length >= 5) {
        setError("A API aceita até 5 evidências por envio.");
        break;
      }
      merged.push(file);
    }
    onChange(merged);
  }

  return (
    <div className="file-uploader">
      <button
        type="button"
        className="drop-zone"
        onClick={() => inputRef.current?.click()}
        onDrop={(event) => {
          event.preventDefault();
          add(event.dataTransfer.files);
        }}
        onDragOver={(event) => event.preventDefault()}
      >
        <UploadCloud />
        <strong>Adicione fotos ou documentos</strong>
        <span>JPG, PNG, WebP ou PDF · até 10 MB por arquivo</span>
        <em><Plus size={14} /> Escolher arquivos</em>
      </button>
      <input ref={inputRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" multiple onChange={(event) => add(event.target.files)} />
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <div className="file-list">
        {files.map((file, index) => {
          const key = `${file.name}-${file.size}`;
          const value = progress[key] ?? 0;
          return (
            <div className="file-item" key={key}>
              <span className="file-icon">{file.type === "application/pdf" ? <FileText /> : <ImageIcon />}</span>
              <div>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB · {file.type}</span>
                {value > 0 ? <div className="progress-track"><span style={{ width: `${value}%` }} /></div> : null}
              </div>
              <Button type="button" variant="ghost" onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remover ${file.name}`}>
                <Trash2 size={16} />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
