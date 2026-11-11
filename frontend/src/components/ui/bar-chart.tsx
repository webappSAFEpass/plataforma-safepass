import { cn } from "@/lib/utils";

type Bar = { label: string; value: number };

type BarChartProps = {
  bars: Bar[];
  label: string;
  /** Rótulo acessível de cada barra (ex.: (bar) => `${bar.label}: ${bar.value}%`). */
  describe: (bar: Bar) => string;
  className?: string;
};

const CHART_HEIGHT = 100;
const BAR_WIDTH = 60;
const GAP = 40;

/** Gráfico de barras simples em SVG. Os valores são normalizados pela maior barra. */
export function BarChart({ bars, label, describe, className }: BarChartProps) {
  const max = Math.max(...bars.map((bar) => bar.value), 1);
  const width = bars.length * BAR_WIDTH + (bars.length - 1) * GAP;
  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="h-full w-full"
      >
        {bars.map((bar, index) => {
          const height = (bar.value / max) * CHART_HEIGHT;
          return (
            <rect
              key={bar.label}
              x={index * (BAR_WIDTH + GAP)}
              y={CHART_HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
              rx="6"
              className="fill-primary transition hover:opacity-80"
            >
              <title>{describe(bar)}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between">
        {bars.map((bar) => (
          <span key={bar.label} className="flex-1 text-center text-[10px] font-bold text-primary">
            {bar.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
