import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  tone?: "default" | "light";
  className?: string;
}

// Marca simplificada em vetor, preservando o azul oficial e o nome SAFEpass.
export function Logo({ tone = "default", className }: LogoProps) {
  const light = tone === "light";
  return (
    <Link href="/" aria-label="SAFEpass — página inicial" className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          light ? "bg-white/15 text-white" : "bg-brand-blue text-white",
        )}
      >
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <span className="font-display text-lg font-bold">
        <span className={light ? "text-white" : "text-brand-blue"}>SAFE</span>
        <span className={cn("font-normal", light ? "text-white/80" : "text-brand-blue/70")}>pass</span>
      </span>
    </Link>
  );
}
