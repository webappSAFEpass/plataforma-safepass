import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card } from "./card";
import { IconTile } from "./icon-tile";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  foot: string;
  tone?: "brand" | "warning";
};

export function StatCard({ icon, label, value, foot, tone = "brand" }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <IconTile icon={icon} tone={tone} />
        <ArrowUpRight className="size-4 text-primary" aria-hidden="true" />
      </div>
      <p className="text-[11px] font-extrabold tracking-[.08em] text-primary uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-[-.05em] text-primary">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-primary">{foot}</p>
    </Card>
  );
}
