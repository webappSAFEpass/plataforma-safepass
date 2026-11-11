import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("animate-pulse rounded-xl bg-brand-blue-soft/70", className)} />
  );
}
