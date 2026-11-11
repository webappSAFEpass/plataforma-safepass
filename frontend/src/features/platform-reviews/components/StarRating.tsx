"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5] as const;

/** Exibição somente leitura. */
export function StarDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`Nota ${value} de 5`} className={cn("flex gap-0.5", className)}>
      {STARS.map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("h-5 w-5", n <= value ? "fill-brand-amber text-brand-amber" : "text-slate-300")}
        />
      ))}
    </span>
  );
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

/** Seletor de nota acessível (radiogroup) com pré-visualização ao passar o mouse. */
export function StarRating({ value, onChange, label = "Sua nota" }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded p-0.5 focus-visible:ring-2 focus-visible:ring-brand-blue"
        >
          <Star
            aria-hidden
            className={cn(
              "h-8 w-8 transition",
              n <= shown ? "fill-brand-amber text-brand-amber" : "text-slate-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
