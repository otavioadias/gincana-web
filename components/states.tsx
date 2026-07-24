"use client";

import { AlertCircle, Inbox, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button, Card } from "@/components/ui";

export function LoadingState({ label = "Organizando as informações…" }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <LoaderCircle className="spin" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="state-box">
      <span className="state-icon">
        <Inbox />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </Card>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Card className="state-box error-state" role="alert">
      <span className="state-icon">
        <AlertCircle />
      </span>
      <h3>Algo não saiu como esperado</h3>
      <p>{error instanceof Error ? error.message : "Tente novamente em alguns instantes."}</p>
      {retry ? (
        <Button variant="secondary" onClick={retry}>
          Tentar novamente
        </Button>
      ) : null}
    </Card>
  );
}

export function PermissionState() {
  return (
    <Card className="state-box">
      <span className="state-icon">
        <LockKeyhole />
      </span>
      <h3>Área restrita</h3>
      <p>Seu perfil não tem permissão para acessar esta página.</p>
    </Card>
  );
}
