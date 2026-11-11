"use client";

import { CreditCard, LayoutDashboard, MessageSquareText, UserRoundPlus } from "lucide-react";
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
] as const;

/** A autorização efetiva sempre é validada na API; aqui a checagem só melhora a navegação. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { data: me, isPending, isError } = useMe();
  const pathname = usePathname();

  if (isPending) return <Skeleton className="m-8 h-64" />;
  if (isError || me?.user.role !== "admin") {
    return (
      <p role="alert" className="mx-auto max-w-md px-6 py-24 text-center text-slate-600">
        Acesso restrito a administradores.{" "}
        <Link href="/" className="font-semibold text-brand-blue underline">Voltar ao início</Link>
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row">
      <nav aria-label="Administração" className="md:w-56 md:shrink-0">
        <h2 className="mb-3 font-display text-sm font-bold text-brand-blue">Administração</h2>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4 md:grid-cols-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                    active ? "bg-brand-blue text-white" : "text-slate-600 hover:bg-brand-blue-soft/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden /> {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 hidden text-xs leading-relaxed text-slate-400 md:block">
          Cupons, pontos e campanhas são mantidos pelo módulo do Desafio 02 para evitar tabelas duplicadas na integração.
        </p>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
