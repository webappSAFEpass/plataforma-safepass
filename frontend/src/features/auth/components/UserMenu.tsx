"use client";

import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Home,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
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
        className="flex items-center gap-1 rounded-full p-1 text-primary transition hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/60">
          <UserCircle className="h-7 w-7" aria-hidden />
        </span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <p className="max-w-56 truncate px-3 py-2 text-xs text-slate-500">{user.full_name}</p>
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
        {user.role === "user" || user.role === "dependent" ? (
          <DropdownMenuItem asChild>
            <Link href="/historico-medico">
              <ClipboardList className="h-4 w-4" aria-hidden /> Histórico médico
            </Link>
          </DropdownMenuItem>
        ) : null}
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
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" aria-hidden /> {logout.isPending ? "Saindo..." : "Log Out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
