"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { StarDisplay } from "@/features/platform-reviews/components/StarRating";
import { useFeaturedReviews } from "@/features/platform-reviews/hooks";
import { PROFILE_LABELS } from "@/features/platform-reviews/types";
import { cn } from "@/lib/utils";

const PER_PAGE = 3;

export function TestimonialsSection() {
  const { data: reviews, isPending, isError } = useFeaturedReviews();
  const { openDialog } = useDialogs();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil((reviews?.length ?? 0) / PER_PAGE));
  const visible = reviews?.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE) ?? [];

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-14 text-center font-display text-3xl font-bold text-brand-blue">
          Vozes da nossa comunidade
        </h2>

        {isPending ? (
          <div className="grid gap-6 md:grid-cols-3" aria-busy>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : isError || reviews.length === 0 ? (
          <div className="text-center text-sm text-slate-500">
            <p>Ainda não há depoimentos publicados.</p>
            <button
              type="button"
              onClick={() => openDialog("feedback")}
              className="mt-2 font-semibold text-brand-blue underline"
            >
              Seja o primeiro a avaliar a plataforma
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              {visible.map((review) => (
                <figure key={review.id} className="rounded-2xl border border-brand-blue-soft bg-brand-blue-soft/20 p-6">
                  <StarDisplay value={review.rating} />
                  {review.comment ? (
                    <blockquote className="mt-3 text-sm leading-relaxed text-slate-600">
                      “{review.comment}”
                    </blockquote>
                  ) : null}
                  <figcaption className="mt-4">
                    <span className="block text-sm font-semibold text-ink">{review.author_name}</span>
                    <span className="block text-xs text-slate-400">{PROFILE_LABELS[review.reviewer_profile]}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  aria-label="Anterior"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-full border border-brand-blue-soft p-2 text-brand-blue disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Página ${i + 1}`}
                      aria-current={i === page}
                      onClick={() => setPage(i)}
                      className={cn("h-2.5 rounded-full transition-all", i === page ? "w-6 bg-brand-blue" : "w-2.5 bg-brand-blue-soft")}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Próximo"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-brand-blue-soft p-2 text-brand-blue disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
