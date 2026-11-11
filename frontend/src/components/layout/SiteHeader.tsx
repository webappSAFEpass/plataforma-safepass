"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { cn } from "@/lib/utils";

const SCROLL_SHADOW_OFFSET = 20;

/** Menu fixo em todas as páginas. O padrão oficial é do squad 1: manter este componente isolado. */
export function SiteHeader() {
  const { data: me } = useMe();
  const { openDialog } = useDialogs();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_SHADOW_OFFSET);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 backdrop-blur transition",
        scrolled ? "bg-white shadow-md" : "bg-white/95",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-4 sm:gap-8">
          <Link href="/#planos" className="hidden text-sm font-medium text-slate-600 hover:text-brand-blue sm:block">
            Conheça Nossos Planos
          </Link>
          {me ? (
            <UserMenu user={me.user} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => openDialog("login")}
                className="text-sm font-medium text-slate-600 hover:text-brand-blue"
              >
                Faça Login
              </button>
              <Button variant="red" size="pill" onClick={() => openDialog("register")}>
                Criar Conta Grátis
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
