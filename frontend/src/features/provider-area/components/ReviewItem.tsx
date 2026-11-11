"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

import { reviewReplySchema, type ReviewReplyValues } from "../schemas";
import type { Review } from "../types";
import { Stars } from "./Stars";

export function ReviewItem({ review }: { review: Review }) {
  const [reply, setReply] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<ReviewReplyValues>({
    resolver: zodResolver(reviewReplySchema),
    defaultValues: { reply: "" },
  });

  const publish = handleSubmit(
    (values) => {
      setReply(values.reply);
      toast.success("Resposta publicada");
    },
    (errors) => toast.error(errors.reply?.message ?? "Escreva uma resposta antes de enviar."),
  );

  return (
    <article className="py-5 first:pt-0 last:pb-0">
      <div className="flex gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-xs font-extrabold text-primary"
          aria-hidden="true"
        >
          {initials(review.author)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-primary">{review.author}</p>
              <p className="mt-0.5 text-[11px] font-medium text-primary">{review.when}</p>
            </div>
            <Stars rating={review.rating} />
          </div>
          <p className="mt-3 text-sm leading-6 text-primary">“{review.text}”</p>
          {reply ? (
            <div className="mt-4 rounded-xl bg-success-soft p-3 text-sm leading-6 text-primary">
              <p className="mb-1 text-[10px] font-extrabold tracking-[.08em] uppercase">
                Sua resposta
              </p>
              {reply}
            </div>
          ) : (
            <form noValidate onSubmit={publish} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Escreva uma resposta pública…"
                aria-label={`Responder a ${review.author}`}
                className="h-10 flex-1"
                {...register("reply")}
              />
              <Button type="submit" variant="soft">
                <Send aria-hidden="true" /> Responder
              </Button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
