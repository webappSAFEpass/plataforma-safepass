import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const fieldClasses =
  "w-full rounded-xl border border-brand-blue-soft bg-white px-4 py-2.5 text-sm text-ink placeholder:text-slate-400 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 aria-[invalid=true]:border-brand-red";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldClasses, className)} {...props} />;
  },
);
