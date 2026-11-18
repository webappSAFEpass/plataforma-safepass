"use client";

import { Mail, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/layout/Logo";
import { useDialogs } from "@/features/dialogs/dialogs-context";

const STARS = [1, 2, 3, 4, 5] as const;
const RESIDENCIA_URL = process.env.NEXT_PUBLIC_RESIDENCIA_URL;

export function SiteFooter() {
  const { openDialog } = useDialogs();

  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3 md:gap-14">
        <div>
          <Logo tone="light" className="mb-5" />
          <p className="mb-5 max-w-xs text-sm leading-relaxed text-white/75">
            Mais acesso, cuidado e benefícios. Juntos para proteger tudo o que mais importa para
            você.
          </p>
          <div
            role="group"
            aria-label="Avalie a plataforma"
            className="mb-5 flex items-center gap-1"
          >
            {STARS.map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Avaliar com ${n} ${n === 1 ? "estrela" : "estrelas"}`}
                onClick={() => openDialog("feedback", { rating: n })}
                className="rounded p-0.5 text-warning transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Star className="h-6 w-6 fill-current" aria-hidden />
              </button>
            ))}
            <span className="ml-2 text-sm text-white/75">Avalie a plataforma</span>
          </div>
          {RESIDENCIA_URL ? (
            <a
              href={RESIDENCIA_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/70 underline decoration-white/40 underline-offset-4 hover:text-white"
            >
              Projeto desenvolvido com apoio da UCB e do Porto Digital
            </a>
          ) : (
            <p className="text-xs text-white/60">
              Desenvolvido com apoio da UCB e do Porto Digital
            </p>
          )}
        </div>

        <div>
          <h4 className="mb-5 font-display text-lg font-bold">Acesso Rápido</h4>
          <ul className="space-y-3 text-sm text-white/75">
            <li>
              <Link href="/" className="transition hover:text-white">
                Página Inicial
              </Link>
            </li>
            <li>
              <Link href="/#planos" className="transition hover:text-white">
                Nossos Planos
              </Link>
            </li>
            <li>
              <Link href="/faq" className="transition hover:text-white">
                Dúvidas Frequentes
              </Link>
            </li>
            <li>
              <Link href="/termos" className="transition hover:text-white">
                Termos de Uso
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-5 font-display text-lg font-bold">Contato</h4>
          <ul className="space-y-3 text-sm text-white/75">
            <li>
              <a
                href="mailto:safepass.contato@gmail.com"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden /> safepass.contato@gmail.com
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/5561992423664"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden /> +55 (61) 99242-3664
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> Brasília, Brasil
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15 px-6 py-5 text-center text-xs text-white/60">
        © {new Date().getFullYear()} SAFEpass. Todos os direitos reservados.
      </div>
    </footer>
  );
}
