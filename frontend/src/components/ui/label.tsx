"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "mb-1.5 block text-[11px] font-extrabold tracking-[.08em] text-primary uppercase",
        className,
      )}
      {...props}
    />
  );
}
