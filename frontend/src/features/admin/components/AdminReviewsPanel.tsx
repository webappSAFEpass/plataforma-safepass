"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAdminReviews, useReplyToReview, useSetReviewPublished } from "@/features/admin/hooks";
import type { AdminReview } from "@/features/admin/types";
import { StarDisplay } from "@/features/platform-reviews/components/StarRating";
import { PROFILE_LABELS } from "@/features/platform-reviews/types";
import { cn, formatDate } from "@/lib/utils";

const PAGE_SIZE = 10;
const RATINGS = [5, 4, 3, 2, 1] as const;

export function AdminReviewsPanel() {
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isPending, isError, isPlaceholderData } = useAdminReviews({ rating, page, size: PAGE_SIZE });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;

  function selectRating(next: number | undefined) {
    setRating(next);
    setPage(1);
  }

  return (
    <section>
      <h1 className="font-display text-2xl font-bold text-brand-blue">Avaliações da plataforma</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Clique numa nota para ver só as avaliações daquele nível. Responda e escolha quais aparecem na página inicial.
      </p>

      <div role="group" aria-label="Filtrar por estrelas" className="mb-6 flex flex-wrap gap-2">
        <FilterChip active={rating === undefined} onClick={() => selectRating(undefined)}>
          Todas
        </FilterChip>
        {RATINGS.map((n) => (
          <FilterChip key={n} active={rating === n} onClick={() => selectRating(n)}>
            {n} <Star className="h-3.5 w-3.5 fill-brand-amber text-brand-amber" aria-label={n === 1 ? "estrela" : "estrelas"} />
          </FilterChip>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-4" aria-busy>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-brand-red">Não foi possível carregar as avaliações.</p>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl bg-brand-blue-soft/40 p-6 text-center text-sm text-slate-500">
          {rating ? `Nenhuma avaliação com ${rating} ${rating === 1 ? "estrela" : "estrelas"}.` : "Nenhuma avaliação recebida ainda."}
        </p>
      ) : (
        <>
          <ul className={cn("space-y-4", isPlaceholderData && "opacity-60")}>
            {data.items.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
            <span>
              {data.total} {data.total === 1 ? "avaliação" : "avaliações"}
            </span>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="pill" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span>
                Página {page} de {totalPages}
              </span>
              <Button variant="outline" size="pill" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-medium transition",
        active ? "border-brand-blue bg-brand-blue text-white" : "border-brand-blue-soft bg-white text-slate-600 hover:border-brand-blue",
      )}
    >
      {children}
    </button>
  );
}

function ReviewItem({ review }: { review: AdminReview }) {
  const reply = useReplyToReview();
  const publish = useSetReviewPublished();
  const [draft, setDraft] = useState(review.admin_reply ?? "");
  const unchanged = draft.trim() === (review.admin_reply ?? "");

  return (
    <li className="rounded-2xl border border-brand-blue-soft bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StarDisplay value={review.rating} />
          <p className="mt-2 text-sm font-semibold text-ink">
            {review.author_name}{" "}
            <span className="font-normal text-slate-400">
              · {PROFILE_LABELS[review.reviewer_profile]} · {formatDate(review.created_at)}
            </span>
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={review.is_published}
            disabled={publish.isPending}
            onChange={(e) => publish.mutate({ id: review.id, isPublished: e.target.checked })}
            className="h-4 w-4 accent-brand-blue"
          />
          Exibir na página inicial
        </label>
      </div>
      {review.comment ? <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.comment}</p> : null}

      <form
        className="mt-4 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) reply.mutate({ id: review.id, reply: draft.trim() });
        }}
      >
        <label htmlFor={`reply-${review.id}`} className="text-xs font-medium text-slate-500">
          {review.admin_reply ? `Sua resposta (${review.replied_at ? formatDate(review.replied_at) : ""})` : "Responder"}
        </label>
        <Textarea id={`reply-${review.id}`} rows={2} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} />
        {reply.error ? <p role="alert" className="text-xs text-brand-red">{reply.error.message}</p> : null}
        <Button type="submit" size="pill" disabled={reply.isPending || !draft.trim() || unchanged}>
          {reply.isPending ? "Salvando..." : review.admin_reply ? "Atualizar resposta" : "Enviar resposta"}
        </Button>
      </form>
    </li>
  );
}
