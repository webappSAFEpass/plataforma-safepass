import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Logo({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl"
      aria-label="SAFEpass, início"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-button">
        <ShieldCheck className="size-5 stroke-[2.2]" aria-hidden="true" />
      </span>
      <span className="font-display text-[21px] font-extrabold tracking-[-.07em] text-primary">
        SAFE<span className="font-semibold">pass</span>
      </span>
    </Link>
  );
}
