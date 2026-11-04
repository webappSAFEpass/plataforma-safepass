"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Header } from "./Header";
import { areaFor } from "./navigation";
import { Sidebar } from "./Sidebar";

/** Header fixo + sidebar da área (prestador ou empresa, pela URL) + conteúdo. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const area = areaFor(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header area={area} onOpenMenu={() => setMenuOpen(true)} />
      <Sidebar area={area} pathname={pathname} open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && (
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-x-0 top-[76px] bottom-0 z-20 bg-primary-strong/25 backdrop-blur-[1px] lg:hidden"
          aria-label="Fechar menu"
        />
      )}
      <div className="min-h-screen pt-[76px] lg:pl-[276px]">
        <main className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-8 [&>*]:motion-safe:animate-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
