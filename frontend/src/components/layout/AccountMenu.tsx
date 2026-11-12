"use client";

import { BriefcaseBusiness, Building2, ChevronDown, LogOut, UserRound } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { COMPANY_AREA, PROVIDER_AREA, type Area } from "./navigation";

// Foto do protótipo. Quando a sessão (Desafio 01) existir, vem do usuário logado.
const AVATAR_URL =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=240&q=80";

export function AccountMenu({ area }: { area: Area }) {
  const router = useRouter();
  const otherArea = area.key === "provider" ? COMPANY_AREA : PROVIDER_AREA;
  const OtherIcon = otherArea.key === "company" ? Building2 : BriefcaseBusiness;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group flex items-center gap-2 rounded-xl p-1.5 pr-2 transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="Abrir menu da conta"
      >
        <Image
          src={AVATAR_URL}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover ring-2 ring-white"
        />
        <ChevronDown
          className="size-4 text-primary transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {area.key === "provider" && (
          <DropdownMenuItem onSelect={() => router.push("/prestador/perfil")}>
            <UserRound className="text-primary" aria-hidden="true" />
            Meu perfil
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => router.push(otherArea.home)}>
          <OtherIcon className="text-primary" aria-hidden="true" />
          Ir para {otherArea.key === "company" ? "Empresa" : "Prestador"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="data-[highlighted]:text-destructive"
          onSelect={() => toast("Sessão encerrada")}
        >
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
