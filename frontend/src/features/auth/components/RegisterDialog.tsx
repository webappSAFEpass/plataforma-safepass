"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Heart, UserPlus, ArrowLeft, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/features/auth/hooks";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas";
import type { AccountType } from "@/features/auth/types";
import { homePathFor } from "@/features/auth/utils";
import { useDialogs } from "@/features/dialogs/dialogs-context";

interface TypeOption {
  type: AccountType;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: "user", label: "Sou Usuário", description: "Proteção familiar e benefícios", icon: Heart, tone: "bg-brand-blue-soft text-brand-blue" },
  { type: "provider", label: "Sou Prestador", description: "Aumente sua visibilidade", icon: UserPlus, tone: "bg-brand-green-soft text-brand-green" },
  { type: "company", label: "Sou Empresa", description: "Benefícios para colaboradores", icon: Briefcase, tone: "bg-brand-amber-soft text-brand-amber" },
];

export function RegisterDialog() {
  const { active, options, closeDialog, openDialog } = useDialogs();
  return (
    <Dialog open={active === "register"} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <Logo className="mb-6" />
        {/* key: reinicia o passo quando o diálogo é reaberto com outro tipo pré-selecionado */}
        <RegisterFlow key={options.accountType ?? "none"} initialType={options.accountType} onLogin={() => openDialog("login")} />
      </DialogContent>
    </Dialog>
  );
}

function RegisterFlow({ initialType, onLogin }: { initialType?: AccountType; onLogin: () => void }) {
  const [type, setType] = useState<AccountType | null>(initialType ?? null);
  const selected = TYPE_OPTIONS.find((option) => option.type === type);

  if (!selected) {
    return (
      <>
        <DialogTitle>Criar conta grátis</DialogTitle>
        <DialogDescription>Selecione seu perfil para continuar</DialogDescription>
        <div className="mt-6 space-y-3">
          {TYPE_OPTIONS.map(({ type: value, label, description, icon: Icon, tone }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-brand-blue-soft p-4 text-left transition hover:border-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="block text-xs text-slate-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <button type="button" onClick={onLogin} className="font-semibold text-brand-blue hover:underline">
            Faça login
          </button>
        </p>
      </>
    );
  }

  return <RegisterForm accountType={selected.type} label={selected.label} onBack={() => setType(null)} />;
}

function RegisterForm({
  accountType,
  label,
  onBack,
}: {
  accountType: AccountType;
  label: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const { closeDialog } = useDialogs();
  const registerMutation = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { account_type: accountType },
  });

  const onSubmit = handleSubmit((values) =>
    registerMutation.mutate(values, {
      onSuccess: ({ user }) => {
        closeDialog();
        router.push(homePathFor(user.role));
      },
    }),
  );

  return (
    <>
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-xs text-slate-500 hover:text-brand-blue">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Trocar perfil
      </button>
      <DialogTitle>Seus dados</DialogTitle>
      <DialogDescription>
        Cadastro como <strong>{label}</strong>
      </DialogDescription>
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <input type="hidden" {...register("account_type")} />
        <Field label="Nome" error={errors.full_name?.message}>
          <Input autoComplete="name" placeholder="Seu nome" {...register("full_name")} />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="voce@exemplo.com" {...register("email")} />
        </Field>
        <Field label="Senha" error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres, com letras e números" {...register("password")} />
        </Field>
        {registerMutation.error ? (
          <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
            {registerMutation.error.message}
          </p>
        ) : null}
        <Button type="submit" variant="red" size="full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? "Criando conta..." : "Criar conta grátis"}
        </Button>
      </form>
    </>
  );
}
