"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useResetPassword } from "@/features/auth/hooks";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";
import { useDialogs } from "@/features/dialogs/dialogs-context";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const { openDialog } = useDialogs();
  const reset = useResetPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <p role="alert" className="text-sm text-brand-red">
        Link inválido. Peça um novo e-mail de recuperação na tela de login.
      </p>
    );
  }

  if (reset.isSuccess) {
    return (
      <div role="status" className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-ink">
          <CheckCircle2 className="h-5 w-5 text-brand-green" aria-hidden /> Senha alterada com sucesso.
        </p>
        <Button onClick={() => openDialog("login")} size="full">
          Entrar na minha conta
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => reset.mutate({ token, new_password: values.password }))}
      noValidate
      className="space-y-4"
    >
      <Field label="Nova senha" error={errors.password?.message}>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Confirme a nova senha" error={errors.confirm?.message}>
        <Input type="password" autoComplete="new-password" {...register("confirm")} />
      </Field>
      {reset.error ? (
        <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
          {reset.error.message}
        </p>
      ) : null}
      <Button type="submit" size="full" disabled={reset.isPending}>
        {reset.isPending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
