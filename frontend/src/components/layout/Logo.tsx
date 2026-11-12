import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  /** "light" para fundos escuros (rodapé). */
  tone?: "default" | "light";
  className?: string;
};

export function Logo({ href = "/", tone = "default", className }: LogoProps) {
  const light = tone === "light";
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 rounded-xl", className)}
      aria-label="SAFEpass, início"
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl shadow-button",
          light ? "bg-white/15 text-white shadow-none" : "bg-primary text-primary-foreground",
        )}
      >
        <ShieldCheck className="size-5 stroke-[2.2]" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-display text-[21px] font-extrabold tracking-[-.07em]",
          light ? "text-white" : "text-primary",
        )}
      >
        SAFE<span className="font-semibold">pass</span>
      </span>
    </Link>
  );
}
