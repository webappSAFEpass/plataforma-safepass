import { forwardRef, type TextareaHTMLAttributes } from "react";

import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldClasses, "resize-none", className)} {...props} />;
});
