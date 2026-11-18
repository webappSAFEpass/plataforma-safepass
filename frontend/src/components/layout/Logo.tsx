import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  /** "light" para fundos escuros (rodapé). */
  tone?: "default" | "light";
  className?: string;
};

/** Logotipo oficial do manual de marca do SAFEpass. */
export function Logo({ href = "/", tone = "default", className }: LogoProps) {
  const src = tone === "light" ? "/brand/safepass-logo-footer.png" : "/brand/safepass-logo.png";
  return (
    <Link
      href={href}
      aria-label="SAFEpass, início"
      className={cn("inline-flex shrink-0 items-center rounded-xl", className)}
    >
      <Image
        src={src}
        alt="SAFEpass"
        width={184}
        height={47}
        priority
        className="h-8 w-auto object-contain sm:h-10"
      />
    </Link>
  );
}
