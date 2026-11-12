import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const inputClassName =
  "h-11 w-full rounded-xl border bg-card px-3 text-base font-normal text-primary outline-none transition placeholder:text-muted-foreground focus:ring-4 focus:ring-accent/60 aria-invalid:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClassName, className)} {...props} />;
}
