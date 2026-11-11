import { Star } from "lucide-react";

import { MAX_RATING } from "../constants";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div
      className={className ?? "flex text-warning"}
      role="img"
      aria-label={`${rating} de ${MAX_RATING} estrelas`}
    >
      {Array.from({ length: rating }, (_, index) => (
        <Star key={index} className="size-4 fill-current" aria-hidden="true" />
      ))}
    </div>
  );
}
