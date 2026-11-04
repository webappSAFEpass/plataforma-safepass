import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border bg-card text-card-foreground shadow-card", className)}
      {...props}
    />
  );
}
