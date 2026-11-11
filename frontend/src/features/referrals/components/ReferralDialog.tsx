"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { useCreateReferral } from "@/features/referrals/hooks";
import { referralSchema, type ReferralInput } from "@/features/referrals/schemas";

export function ReferralDialog() {
  const { active, closeDialog } = useDialogs();
  return (
    <Dialog open={active === "referral"} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <ReferralForm />
      </DialogContent>
    </Dialog>
  );
}

function ReferralForm() {
  const { closeDialog } = useDialogs();
  const create = useCreateReferral();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReferralInput>({ resolver: zodResolver(referralSchema) });

  if (create.isSuccess) {
    return (
      <div role="status" className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-green" aria-hidden />
        <DialogTitle className="mt-3 text-xl">Indicação enviada!</DialogTitle>
        <DialogDescription>Nossa equipe vai entrar em contato com o profissional.</DialogDescription>
        <Button className="mt-6" onClick={closeDialog}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <>
      <DialogTitle>Indicar Profissional</DialogTitle>
      <DialogDescription>Recomende alguém de confiança para fazer parte da plataforma.</DialogDescription>
      <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="mt-6 space-y-4">
        <Field label="Nome do profissional" error={errors.professional_name?.message}>
          <Input placeholder="Dr. Carlos Mendes" {...register("professional_name")} />
        </Field>
        <Field label="Especialidade" error={errors.specialty?.message}>
          <Input placeholder="Clínico Geral, Dentista..." {...register("specialty")} />
        </Field>
        <Field label="Contato" error={errors.contact?.message}>
          <Input placeholder="@drcarlos ou (61) 9xxxx-xxxx" {...register("contact")} />
        </Field>
        {create.error ? (
          <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
            {create.error.message}
          </p>
        ) : null}
        <Button type="submit" variant="red" size="full" disabled={create.isPending}>
          {create.isPending ? "Enviando..." : "Enviar indicação"}
        </Button>
      </form>
    </>
  );
}
