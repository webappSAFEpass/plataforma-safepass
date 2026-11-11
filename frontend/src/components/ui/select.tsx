import { forwardRef, type SelectHTMLAttributes } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldClasses, className)} {...props} />;
  },
);
