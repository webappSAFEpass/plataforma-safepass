"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useForgotPassword, useLogin } from "@/features/auth/hooks";
import {
  forgotPasswordSchema,
  loginSchema,
  type ForgotPasswordInput,
  type LoginInput,
} from "@/features/auth/schemas";
import { homePathFor } from "@/features/auth/utils";
import { useDialogs } from "@/features/dialogs/dialogs-context";

type Step = "login" | "forgot";

export function LoginDialog() {
  const { active, closeDialog, openDialog } = useDialogs();
  const [step, setStep] = useState<Step>("login");

  return (
    <Dialog
      open={active === "login"}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
          setStep("login");
        }
      }}
    >
      <DialogContent>
        <Logo className="mb-6" />
        {step === "login" ? (
          <LoginForm onForgot={() => setStep("forgot")} onRegister={() => openDialog("register")} />
        ) : (
          <ForgotPasswordForm onBack={() => setStep("login")} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LoginForm({ onForgot, onRegister }: { onForgot: () => void; onRegister: () => void }) {
  const router = useRouter();
  const { closeDialog } = useDialogs();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: ({ user }) => {
        closeDialog();
        router.push(homePathFor(user.role));
      },
    }),
  );

  return (
    <>
      <DialogTitle>Bem-vindo de volta</DialogTitle>
      <DialogDescription>Faça login na sua conta SAFEpass</DialogDescription>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            {...register("password")}
          />
        </Field>
        <div className="text-right">
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-medium text-brand-red hover:underline"
          >
            Esqueceu sua senha? Recupere aqui!
          </button>
        </div>
        {login.error ? (
          <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
            {login.error.message}
          </p>
        ) : null}
        <Button type="submit" size="full" disabled={login.isPending}>
          {login.isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        Não tem conta ainda?{" "}
        <button type="button" onClick={onRegister} className="font-semibold text-brand-blue hover:underline">
          Cadastre-se!
        </button>
      </p>
    </>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  return (
    <>
      <DialogTitle>Recuperar senha</DialogTitle>
      <DialogDescription>Enviaremos um link para o e-mail cadastrado.</DialogDescription>
      {forgot.isSuccess ? (
        <div role="status" className="mt-6 flex gap-3 rounded-xl bg-brand-green-soft p-4 text-sm text-ink">
          <MailCheck className="h-5 w-5 shrink-0 text-brand-green" aria-hidden />
          <p>
            Se <strong>{getValues("email")}</strong> estiver cadastrado, você receberá as instruções em
            instantes. O link vale por 30 minutos.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => forgot.mutate(values))}
          noValidate
          className="mt-6 space-y-4"
        >
          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />
          </Field>
          {forgot.error ? (
            <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
              {forgot.error.message}
            </p>
          ) : null}
          <Button type="submit" size="full" disabled={forgot.isPending}>
            {forgot.isPending ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-5 text-sm text-slate-500 hover:text-brand-blue">
        ← Voltar ao login
      </button>
    </>
  );
}
