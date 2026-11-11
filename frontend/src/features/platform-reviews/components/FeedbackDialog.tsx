"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { StarRating } from "@/features/platform-reviews/components/StarRating";
import { useCreateReview } from "@/features/platform-reviews/hooks";
import { feedbackSchema, type FeedbackInput } from "@/features/platform-reviews/schemas";
import { PROFILE_LABELS, type ReviewerProfile } from "@/features/platform-reviews/types";

const PROFILE_OPTIONS: ReviewerProfile[] = ["visitor", "user", "provider", "company"];
const VISITOR_LABEL = "Usuário não cadastrado";

export function FeedbackDialog() {
  const { active, closeDialog } = useDialogs();
  return (
    <Dialog open={active === "feedback"} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <FeedbackForm />
      </DialogContent>
    </Dialog>
  );
}

function FeedbackForm() {
  const { options, closeDialog } = useDialogs();
  const { data: me } = useMe();
  const create = useCreateReview();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FeedbackInput>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      author_name: me?.user.full_name ?? "",
      reviewer_profile: me && me.user.role !== "admin" && me.user.role !== "dependent" ? me.user.role : undefined,
      rating: options.rating ?? 0,
    },
  });
  const rating = watch("rating");

  if (create.isSuccess) {
    return (
      <div role="status" className="py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand-green" aria-hidden />
        <DialogTitle className="mt-3 text-xl">Obrigado!</DialogTitle>
        <DialogDescription>Sua avaliação foi enviada para a equipe SAFEpass.</DialogDescription>
        <Button className="mt-6" onClick={closeDialog}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <>
      <DialogTitle>Deixe seu feedback</DialogTitle>
      <DialogDescription>Avalie a plataforma SAFEpass.</DialogDescription>
      <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="mt-6 space-y-4">
        <Field label="Seu nome" error={errors.author_name?.message}>
          <Input autoComplete="name" placeholder="Ana Silva" {...register("author_name")} />
        </Field>
        <Field label="Selecione seu perfil" error={errors.reviewer_profile?.message}>
          <Select defaultValue={me ? undefined : ""} {...register("reviewer_profile")}>
            <option value="" disabled>
              Selecione seu perfil
            </option>
            {PROFILE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === "visitor" ? VISITOR_LABEL : PROFILE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comentário (opcional)" error={errors.comment?.message}>
          <Textarea rows={3} placeholder="Conte-nos sua experiência..." {...register("comment")} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-ink">Sua nota</p>
          <StarRating value={rating} onChange={(v) => setValue("rating", v, { shouldValidate: true })} />
          {errors.rating ? (
            <p role="alert" className="text-xs text-brand-red">
              {errors.rating.message}
            </p>
          ) : null}
        </div>
        {create.error ? (
          <p role="alert" className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
            {create.error.message}
          </p>
        ) : null}
        <Button type="submit" variant="red" size="full" disabled={create.isPending}>
          {create.isPending ? "Enviando..." : "Enviar avaliação"}
        </Button>
      </form>
    </>
  );
}
