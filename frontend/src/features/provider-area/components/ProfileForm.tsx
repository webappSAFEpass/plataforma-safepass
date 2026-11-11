"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Globe2, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

import { provider } from "../data";
import { PROFILE_FORM_ID } from "../constants";
import { profileFormSchema, type ProfileFormValues } from "../schemas";

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: provider.name,
      specialty: provider.specialty,
      about: provider.about,
      clinic: provider.clinic,
      registry: provider.registry,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      website: provider.website,
    },
  });

  return (
    <form
      id={PROFILE_FORM_ID}
      noValidate
      onSubmit={handleSubmit(() => toast.success("Alterações salvas com sucesso"))}
      className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"
    >
      <Card className="p-5 sm:p-6">
        <SectionHeader
          icon={UserRound}
          title="Informações públicas"
          description="O que pacientes veem no seu perfil."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nome de exibição"
            error={errors.displayName?.message}
            {...register("displayName")}
          />
          <TextField
            label="Especialidade"
            error={errors.specialty?.message}
            {...register("specialty")}
          />
          <div className="sm:col-span-2">
            <Label htmlFor="profile-about">Sobre a profissional</Label>
            <Textarea id="profile-about" {...register("about")} />
            {errors.about && (
              <p className="mt-1.5 text-xs font-semibold text-destructive">
                {errors.about.message}
              </p>
            )}
          </div>
          <TextField
            label="Clínica / consultório"
            error={errors.clinic?.message}
            {...register("clinic")}
          />
          <TextField
            label="Registro profissional"
            error={errors.registry?.message}
            {...register("registry")}
          />
        </div>
      </Card>
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={Phone}
            title="Contato e endereço"
            description="Informações para agendamento."
          />
          <div className="space-y-4">
            <TextField
              label="Telefone"
              icon={Phone}
              type="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <TextField
              label="E-mail"
              icon={Mail}
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <TextField label="Endereço" icon={MapPin} {...register("address")} />
            <TextField label="Site" icon={Globe2} {...register("website")} />
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionHeader
            title="Valores e atendimento"
            description="Exibidos no catálogo SAFEpass."
            action={<Pencil className="size-4 text-primary" aria-hidden="true" />}
          />
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-success-soft p-3">
              <dt className="text-[10px] font-extrabold tracking-[.08em] text-primary uppercase">
                Consulta a partir de
              </dt>
              <dd className="mt-1 font-display text-xl font-extrabold text-primary">
                {formatCurrency(provider.startingPrice)}
              </dd>
            </div>
            <div className="rounded-xl bg-success-soft p-3">
              <dt className="text-[10px] font-extrabold tracking-[.08em] text-primary uppercase">
                Modalidade
              </dt>
              <dd className="mt-1 text-sm font-bold text-primary">{provider.modality}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </form>
  );
}
