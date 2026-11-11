import { cn, formatPercent } from "@/lib/utils";

const VIEWBOX = 36;
const RADIUS = 15.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = {
  /** De 0 a 1. */
  ratio: number;
  label: string;
  /** Classes do traço preenchido e do trilho (ex.: "stroke-accent", "stroke-card/15"). */
  indicatorClassName?: string;
  trackClassName?: string;
  className?: string;
  textClassName?: string;
};

export function ProgressRing({
  ratio,
  label,
  indicatorClassName = "stroke-primary",
  trackClassName = "stroke-border",
  className,
  textClassName,
}: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <div
      role="img"
      aria-label={`${label}: ${formatPercent(clamped)}`}
      className={cn("relative grid size-16 place-items-center", className)}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="absolute inset-0 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="3.5"
          className={trackClassName}
        />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          strokeWidth="3.5"
          strokeDasharray={`${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          className={indicatorClassName}
        />
      </svg>
      <span className={cn("font-display text-sm font-extrabold", textClassName)}>
        {formatPercent(clamped)}
      </span>
    </div>
  );
}
