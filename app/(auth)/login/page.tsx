"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, HeartHandshake, Leaf, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";

const schema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  organizationSlug: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await login({
        ...values,
        organizationSlug: values.organizationSlug || undefined,
      });
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : "Não foi possível entrar. Tente novamente.",
      );
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="story-orb story-orb-one" />
        <div className="story-orb story-orb-two" />
        <div className="login-brand">
          <span className="brand-mark"><HeartHandshake /></span>
          <div><strong>Gincana</strong><span>Solidária</span></div>
        </div>
        <div className="story-content">
          <span className="story-kicker"><Leaf size={16} /> Pequenas ações, grandes mudanças</span>
          <h1>Cada gesto conta.<br />Cada pessoa transforma.</h1>
          <p>
            Registre ações solidárias, acompanhe o impacto coletivo e celebre tudo o que sua equipe constrói junta.
          </p>
          <div className="story-stat">
            <strong>Impacto é feito em equipe.</strong>
            <span>Continue a jornada da sua organização.</span>
          </div>
        </div>
        <p className="story-footer">Feito para aproximar pessoas e propósitos.</p>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="mobile-brand"><HeartHandshake size={24} /> Gincana Solidária</span>
            <p className="eyebrow">Bem-vindo de volta</p>
            <h2>Entre na sua conta</h2>
            <p>Use os dados cadastrados pela sua organização.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
            <Field label="E-mail" error={errors.email?.message}>
              <div className="input-with-icon">
                <Mail size={18} />
                <Input type="email" autoComplete="email" placeholder="voce@empresa.com" {...register("email")} />
              </div>
            </Field>
            <Field label="Senha" error={errors.password?.message}>
              <div className="input-with-icon">
                <LockKeyhole size={18} />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  {...register("password")}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <Field label="Organização (opcional)" error={errors.organizationSlug?.message} hint="Preencha somente se você participa de mais de uma organização.">
              <Input placeholder="ex.: minha-empresa" {...register("organizationSlug")} />
            </Field>
            {serverError ? <div className="form-alert" role="alert">{serverError}</div> : null}
            <Button type="submit" loading={isSubmitting} className="login-submit">
              Entrar <ArrowRight size={18} />
            </Button>
          </form>
          <p className="login-help">
            Problemas para entrar? Fale com a pessoa responsável pela gincana na sua organização.
          </p>
        </div>
      </section>
    </main>
  );
}
