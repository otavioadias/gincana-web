"use client";

import { AlertCircle, X } from "lucide-react";
import { translateApiError } from "@/lib/api-client";
import { Button, Card } from "@/components/ui";

export function ApiErrorAlert({
  error,
  fallback,
}: {
  error: unknown;
  fallback?: string;
}) {
  if (!error) return null;
  return (
    <div className="api-error-alert" role="alert">
      <AlertCircle size={18} aria-hidden />
      <p>{translateApiError(error, fallback)}</p>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  loading,
  destructive,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <Card
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={19} />
        </button>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={destructive ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
