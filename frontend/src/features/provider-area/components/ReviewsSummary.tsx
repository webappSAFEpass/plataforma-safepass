import { Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatRating } from "@/lib/utils";

import { AVERAGE_RATING, MAX_RATING, REVIEW_COUNT } from "../constants";
import { ratingDistribution } from "../data";
import { Stars } from "./Stars";

export function ReviewsSummary() {
  return (
    <section className="mb-5 grid gap-4 md:grid-cols-[.8fr_1.2fr]">
      <Card className="p-6">
        <p className="text-[11px] font-extrabold tracking-[.1em] text-primary uppercase">
          Nota geral
        </p>
        <div className="mt-2 flex items-end gap-3">
          <span className="font-display text-5xl font-extrabold tracking-[-.08em] text-primary">
            {formatRating(AVERAGE_RATING)}
          </span>
          <div className="pb-1">
            <Stars rating={MAX_RATING} />
            <p className="mt-1 text-xs font-medium text-primary">
              Baseado em {REVIEW_COUNT} avaliações
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-6">
        <ul className="grid grid-cols-5 gap-3" aria-label="Distribuição das notas">
          {ratingDistribution.map(({ stars, share }) => (
            <li key={stars} className="text-center">
              <div className="flex h-20 items-end justify-center">
                <svg
                  viewBox="0 0 10 100"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y={100 - share}
                    width="10"
                    height={share}
                    rx="1.5"
                    className="fill-primary"
                  />
                </svg>
              </div>
              <p className="mt-2 text-xs font-bold text-primary">
                {stars}{" "}
                <Star className="inline size-3 fill-warning text-warning" aria-hidden="true" />
                <span className="sr-only">: {share}% das avaliações</span>
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
