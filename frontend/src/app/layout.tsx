import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "@/app/providers";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "SAFEpass — Juntos para proteger tudo que mais importa para você",
  description:
    "Conectamos você a serviços de saúde, proteção e bem-estar com confiança, benefícios reais e tudo em um só lugar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-white font-sans text-ink antialiased">
        <Providers>
          <SiteHeader />
          <main className="pt-16">{children}</main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
