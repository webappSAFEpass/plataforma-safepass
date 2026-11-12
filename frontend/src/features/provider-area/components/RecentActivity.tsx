import { Bell, CalendarDays, Star, Ticket, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { SectionHeader } from "@/components/ui/section-header";
import { ToastButton } from "@/components/ui/toast-button";

import { recentActivity } from "../data";
import type { ActivityKind } from "../types";

const ACTIVITY_STYLE: Record<
  ActivityKind,
  { icon: LucideIcon; tone: ComponentProps<typeof IconTile>["tone"] }
> = {
  review: { icon: Star, tone: "warning" },
  coupon: { icon: Ticket, tone: "positive" },
  appointment: { icon: CalendarDays, tone: "brand" },
};

export function RecentActivity() {
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeader
        title="Atividade recente"
        action={<Bell className="size-4 text-primary" aria-hidden="true" />}
      />
      <ul className="space-y-5">
        {recentActivity.map((activity) => {
          const style = ACTIVITY_STYLE[activity.kind];
          return (
            <li key={activity.title} className="flex gap-3">
              <IconTile icon={style.icon} tone={style.tone} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-bold text-primary">{activity.title}</p>
                  <span className="text-[10px] font-semibold whitespace-nowrap text-primary">
                    {activity.when}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-primary">{activity.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <ToastButton
        variant="link"
        size="inline"
        className="mt-5 w-full border-t pt-4"
        message="Central de notificações em breve"
      >
        Ver todas as notificações
      </ToastButton>
    </Card>
  );
}
