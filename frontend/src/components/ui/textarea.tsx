import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { inputClassName } from "./input";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClassName, "min-h-[110px] resize-none p-3 leading-6", className)}
      {...props}
    />
  );
}
