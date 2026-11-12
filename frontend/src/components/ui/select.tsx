import { forwardRef, type SelectHTMLAttributes } from "react";

import { inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(inputClassName, className)} {...props} />;
  },
);
