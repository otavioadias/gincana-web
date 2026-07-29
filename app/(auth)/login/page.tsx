"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Eye, EyeOff, HeartHandshake, Leaf, LockKeyhole, Mail, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui";
import { useSession } from "@/features/auth/session-provider";

const schema = z.object({
  mode: z.enum(["login", "register"]),
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  name: z.string().optional(),
  remember: z.boolean(),
}).superRefine((values, context) => {
  if (values.mode !== "register") return;
  if (!values.name || values.name.trim().length < 2) {
    context.addIssue({ code: "custom", path: ["name"], message: "Informe seu nome" });
  }
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login, registerLeader } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: "login", remember: false },
  });
  const mode = useWatch({ control, name: "mode" });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      if (values.mode === "register") {
        await registerLeader({
          name: values.name!.trim(),
          email: values.email,
          password: values.password,
          remember: values.remember,
        });
      } else {
        await login({
          email: values.email,
          password: values.password,
          remember: values.remember,
        });
      }
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
            <span>Continue a jornada com a sua equipe.</span>
          </div>
        </div>
        <p className="story-footer">Feito para aproximar pessoas e propósitos.</p>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-heading">
            <span className="mobile-brand"><HeartHandshake size={24} /> Gincana Solidária</span>
            <p className="eyebrow">Bem-vindo de volta</p>
            <h2>{mode === "register" ? "Primeiro acesso de líder" : "Entre na sua conta"}</h2>
            <p>{mode === "register" ? "Crie seu acesso. Se ainda não tiver equipe, você poderá criá-la em seguida." : "Use seu e-mail e sua senha para continuar."}</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="login-form" noValidate>
            <input type="hidden" {...register("mode")} />
            {mode === "register" ? (
              <Field label="Seu nome" error={errors.name?.message}>
                <Input autoComplete="name" placeholder="Como podemos chamar você?" {...register("name")} />
              </Field>
            ) : null}
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
            <label className="remember-option">
              <input type="checkbox" {...register("remember")} />
              <span>Manter conectado neste dispositivo</span>
            </label>
            {serverError ? <div className="form-alert" role="alert">{serverError}</div> : null}
            <Button type="submit" loading={isSubmitting} className="login-submit">
              {mode === "register" ? "Criar acesso de líder" : "Entrar"} <ArrowRight size={18} />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setServerError("");
                reset({ mode: mode === "register" ? "login" : "register", remember: false });
              }}
            >
              {mode === "register" ? <><ArrowLeft size={17} /> Voltar ao login</> : <><UserRoundCheck size={17} /> Primeiro acesso de líder</>}
            </Button>
          </form>
          <p className="login-help">
            {mode === "register"
              ? "Somente líderes podem criar equipes. Administradores também podem cadastrar uma equipe com seu líder inicial."
              : "Problemas para entrar? Fale com uma pessoa líder da sua equipe."}
          </p>
        </div>
      </section>
    </main>
  );
}
