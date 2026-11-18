"use client";

import {
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  UserRoundPlus,
  Ticket,
  Megaphone,
  Handshake,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: MessageSquareText },
  { href: "/admin/indicacoes", label: "Indicações", icon: UserRoundPlus },
  { href: "/admin/planos", label: "Planos", icon: CreditCard },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/admin/parcerias", label: "Parcerias", icon: Handshake },
] as const;

/** A checagem visual melhora a navegação; a autorização real deve ser repetida no backend. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { data: me, isPending, isError } = useMe();
  const pathname = usePathname();

  if (isPending)
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Skeleton className="h-72" />
      </div>
    );
  if (isError || me?.user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-primary">Acesso restrito</h1>
        <p role="alert" className="mt-2 text-sm leading-relaxed text-slate-600">
          Esta área é exclusiva para administradores do SAFEpass.
        </p>
        <Link href="/" className="mt-5 inline-flex font-semibold text-primary underline">
          Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 md:flex-row md:gap-9 md:py-10">
      <aside className="md:w-60 md:shrink-0">
        <h2 className="mb-3 px-1 font-display text-lg font-bold text-primary">Administração</h2>
        <nav aria-label="Administração">
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/admin"
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-primary text-white shadow-sm"
                        : "text-slate-600 hover:bg-accent/70 hover:text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="mt-5 rounded-xl bg-accent/35 p-3 text-xs leading-relaxed text-slate-500">
          Painel administrativo do Desafio 01. Acesso e permissões de dados devem ser validados
          também pela API.
        </p>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
