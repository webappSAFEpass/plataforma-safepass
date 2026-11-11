"use client";

import { ChevronDown, LayoutDashboard, LogOut, Home, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/hooks";
import type { User } from "@/features/auth/types";

/** Ícone + setinha do header logado: Página Inicial, Meu Dashboard, Log Out (Rev1). */
export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu da conta de ${user.full_name}`}
        className="flex items-center gap-1 rounded-full p-1 text-brand-blue hover:bg-brand-blue-soft/60 focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        <UserCircle className="h-8 w-8" aria-hidden />
        <ChevronDown className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <p className="truncate px-3 py-2 text-xs text-slate-500">{user.full_name}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden /> Página Inicial
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={user.role === "admin" ? "/admin" : "/painel"}>
            <LayoutDashboard className="h-4 w-4" aria-hidden /> Meu Dashboard
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/avaliacoes">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Painel administrativo
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => logout.mutate(undefined, { onSettled: () => router.push("/") })}
        >
          <LogOut className="h-4 w-4" aria-hidden /> Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
