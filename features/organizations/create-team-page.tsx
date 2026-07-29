"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Field, Input, PageHeading } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";

const schema = z.object({
  teamName: z.string().trim().min(3, "Informe um nome com pelo menos 3 caracteres"),
});

type Values = z.infer<typeof schema>;

export function CreateTeamPage() {
  const { createTeam } = useSession();
  const [serverError, setServerError] = useState("");
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function submit(values: Values) {
    setServerError("");
    try {
      await createTeam(values);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Não foi possível criar a equipe.",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Primeiro acesso"
        title="Crie sua equipe"
        description="Seu acesso já é de líder. Agora dê um nome à equipe para começar a convidar pessoas e registrar ações."
      />
      <Card className="inline-form-card">
        <div className="card-heading">
          <span className="metric-icon metric-green"><Building2 /></span>
          <div>
            <p className="eyebrow">Configuração inicial</p>
            <h3>Você será o primeiro líder e também poderá participar</h3>
          </div>
        </div>
        <form className="form-grid" onSubmit={form.handleSubmit(submit)}>
          <Field label="Nome da equipe" error={form.formState.errors.teamName?.message}>
            <Input placeholder="Equipe Esperança" {...form.register("teamName")} />
          </Field>
          {serverError ? <div className="form-alert" role="alert">{serverError}</div> : null}
          <div className="form-actions">
            <Button loading={form.formState.isSubmitting}>
              <Sparkles size={17} /> Criar equipe e continuar
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
