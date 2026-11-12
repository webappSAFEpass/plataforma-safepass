"use client";

import { Menu } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import type { Area } from "./navigation";

type HeaderProps = {
  area: Area;
  onOpenMenu: () => void;
};

export function Header({ area, onOpenMenu }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-[76px] items-center justify-between border-b bg-card px-4 shadow-bar sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden [&_svg]:size-5"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu aria-hidden="true" />
        </Button>
        <Logo href={area.home} />
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <Button
          variant="link"
          size="inline"
          className="text-sm sm:text-base"
          onClick={() =>
            toast("Conheça os planos SAFEpass", {
              description: "A apresentação de planos estará disponível aqui.",
            })
          }
        >
          Conheça Nossos Planos
        </Button>
        <AccountMenu area={area} />
      </div>
    </header>
  );
}
