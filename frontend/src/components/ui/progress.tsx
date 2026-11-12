import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  max: number;
  label: string;
  className?: string;
};

/** Barra de progresso nativa (acessível, sem estilo inline). */
export function Progress({ value, max, label, className }: ProgressProps) {
  return (
    <progress
      value={value}
      max={max}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary",
        className,
      )}
    />
  );
}
