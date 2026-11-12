"use client";

import { HelpCircle, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { isActive, type Area } from "./navigation";

type SidebarProps = {
  area: Area;
  pathname: string;
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ area, pathname, open, onClose }: SidebarProps) {
  return (
    <aside
      id="app-sidebar"
      className={cn(
        "fixed top-[76px] bottom-0 left-0 z-30 flex w-[276px] flex-col border-r bg-card px-4 py-5 text-primary shadow-[8px_0_24px_rgb(63_104_134/0.04)] transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex justify-end px-2 lg:hidden">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
          <X aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-7 px-2 text-[10px] font-extrabold tracking-[.13em] text-subtle uppercase">
        {area.label}
      </p>
      <nav className="mt-3 space-y-1" aria-label={`Navegação da ${area.label.toLowerCase()}`}>
        {area.items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item, area, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-normal transition",
                active
                  ? "bg-accent text-primary shadow-[0_6px_16px_rgb(63_104_134/0.08)]"
                  : "text-muted-foreground hover:bg-muted hover:text-primary",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px]",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                )}
                aria-hidden="true"
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold",
                    active ? "bg-card text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => toast("A Central de ajuda está disponível para orientar você.")}
          className="flex w-full items-center gap-3 rounded-2xl border bg-muted/60 px-3 py-3 text-left text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-primary"
        >
          <HelpCircle className="size-[18px] text-primary" aria-hidden="true" />
          Central de ajuda
        </button>
      </div>
    </aside>
  );
}
