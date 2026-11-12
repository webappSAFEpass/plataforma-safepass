import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IconTile } from "./icon-tile";

type SectionHeaderProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({ title, description, icon, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-5 flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-3">
        {icon && <IconTile icon={icon} />}
        <div>
          <h3 className="font-display text-lg font-extrabold tracking-[-.04em] text-primary">
            {title}
          </h3>
          {description && <p className="mt-1 text-xs font-medium text-primary">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
