"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";

import { employeeInviteSchema, type EmployeeInviteValues } from "../schemas";

export function EmployeeInviteForm({
  onInvite,
}: {
  onInvite: (values: EmployeeInviteValues) => boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeInviteValues>({
    resolver: zodResolver(employeeInviteSchema),
    defaultValues: { name: "", email: "", area: "" },
  });

  const submit = handleSubmit((values) => {
    if (onInvite(values)) reset();
  });

  return (
    <Card className="mb-5 p-5">
      <form
        noValidate
        onSubmit={submit}
        aria-label="Convidar colaborador"
        className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <TextField
          label="Nome completo"
          placeholder="Nome do colaborador"
          autoFocus
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="E-mail corporativo"
          type="email"
          placeholder="nome@empresa.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Área"
          placeholder="Ex.: Operações"
          error={errors.area?.message}
          {...register("area")}
        />
        <div className="self-start md:pt-[22px]">
          <Button type="submit" className="h-11 w-full">
            <Send aria-hidden="true" /> Enviar convite
          </Button>
        </div>
      </form>
    </Card>
  );
}
