import type { LucideIcon } from "lucide-react";
import { useId, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { Input } from "./input";
import { Label } from "./label";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  icon?: LucideIcon;
  error?: string;
};

/** Label + input (+ ícone e mensagem de erro). Funciona com `register()` do React Hook Form. */
export function TextField({ label, icon: Icon, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary"
            aria-hidden="true"
          />
        )}
        <Input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(Icon && "pl-9")}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
