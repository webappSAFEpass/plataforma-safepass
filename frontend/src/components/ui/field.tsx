import { cloneElement, useId, type ReactElement } from "react";

interface FieldProps {
  label: string;
  error?: string;
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}

/** Associa label, controle e mensagem de erro (acessibilidade) sem repetir markup. */
export function Field({ label, error, children }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-brand-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
