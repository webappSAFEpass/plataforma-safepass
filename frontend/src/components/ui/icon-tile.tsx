import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const iconTileVariants = cva("grid shrink-0 place-items-center", {
  variants: {
    tone: {
      brand: "bg-accent text-primary",
      success: "bg-success-soft text-primary",
      positive: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      danger: "bg-destructive-soft text-destructive",
      inverse: "bg-card/10 text-accent",
      plain: "bg-card text-primary shadow-sm",
    },
    size: {
      sm: "size-8 rounded-lg [&_svg]:size-4",
      md: "size-9 rounded-xl [&_svg]:size-[18px]",
      lg: "size-10 rounded-xl [&_svg]:size-5",
      xl: "size-16 rounded-2xl [&_svg]:size-8",
    },
  },
  defaultVariants: { tone: "success", size: "md" },
});

type IconTileProps = VariantProps<typeof iconTileVariants> & {
  icon: LucideIcon;
  className?: string;
};

/** Ícone dentro de um quadrado colorido: usado em cabeçalhos de seção, métricas e listas. */
export function IconTile({ icon: Icon, tone, size, className }: IconTileProps) {
  return (
    <div className={cn(iconTileVariants({ tone, size }), className)} aria-hidden="true">
      <Icon />
    </div>
  );
}
