"use client";

import { Mail, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { useDialogs } from "@/features/dialogs/dialogs-context";

const STARS = [1, 2, 3, 4, 5] as const;

export function SiteFooter() {
  const { openDialog } = useDialogs();

  return (
    <footer className="bg-brand-blue text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <Logo tone="light" className="mb-4" />
          <p className="mb-5 text-sm leading-relaxed text-white/70">
            Mais acesso, cuidado e benefícios.
            <br />
            Juntos para proteger tudo o que mais importa para você.
          </p>
          <div role="group" aria-label="Avalie a plataforma" className="mb-5 flex items-center gap-1">
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Avaliar com ${n} ${n === 1 ? "estrela" : "estrelas"}`}
                onClick={() => openDialog("feedback", { rating: n })}
                className="rounded p-0.5 text-brand-amber transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Star className="h-6 w-6" aria-hidden />
              </button>
            ))}
            <span className="ml-2 text-sm text-white/70">Avalie a plataforma</span>
          </div>
          <p className="text-xs text-white/50">Desenvolvido com apoio da UCB e Porto Digital</p>
        </div>

        <div>
          <h4 className="mb-4 font-display text-sm font-bold">Acesso Rápido</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/" className="hover:text-white">Página Inicial</Link></li>
            <li><Link href="/#planos" className="hover:text-white">Nossos Planos</Link></li>
            <li><Link href="/faq" className="hover:text-white">Dúvidas Frequentes</Link></li>
            <li><Link href="/termos" className="hover:text-white">Termos de Uso</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display text-sm font-bold">Contato</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <a href="mailto:safepass.contato@gmail.com" className="flex items-center gap-2 hover:text-white">
                <Mail className="h-4 w-4" aria-hidden /> safepass.contato@gmail.com
              </a>
            </li>
            <li>
              <a href="https://wa.me/5561992423664" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white">
                <Phone className="h-4 w-4" aria-hidden /> +55 (61) 99242-3664
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden /> Brasília, Brasil
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} SAFEpass Platform. Todos os direitos reservados.
      </div>
    </footer>
  );
}
