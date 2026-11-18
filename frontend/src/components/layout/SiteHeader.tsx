"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserCircle } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/features/auth/components/UserMenu";
import { useMe } from "@/features/auth/hooks";
import { useDialogs } from "@/features/dialogs/dialogs-context";
import { cn } from "@/lib/utils";

const SCROLL_SHADOW_OFFSET = 20;

/** Header fixo compartilhado, seguindo o padrão visual definido pelo Squad 1. */
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
        "fixed inset-x-0 top-0 z-40 border-b border-accent/50 backdrop-blur transition",
        scrolled ? "bg-white shadow-md" : "bg-white/95",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/#planos"
            className="hidden text-sm font-semibold text-slate-600 transition hover:text-primary sm:block"
          >
            Conheça Nossos Planos
          </Link>
          {me ? (
            <UserMenu user={me.user} />
          ) : (
            <>
              <button
                type="button"
                onClick={() => openDialog("login")}
                className="hidden text-sm font-semibold text-slate-600 transition hover:text-primary sm:block"
              >
                Faça Login
              </button>
              <Button
                variant="cta"
                size="pill"
                onClick={() => openDialog("register")}
                className="px-3 sm:px-5"
              >
                <span className="sm:hidden">Cadastrar</span>
                <span className="hidden sm:inline">Criar Conta Grátis</span>
              </Button>
              <button
                type="button"
                aria-label="Entrar na sua conta"
                title="Entrar na sua conta"
                onClick={() => openDialog("login")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary transition hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <UserCircle className="h-8 w-8" aria-hidden />
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
