import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos como moeda: 4990 -> "R$ 49,90". */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

const THOUSAND = 1_000;
const MILLION = 1_000_000;

function compact(value: number, suffix: string): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}${suffix}`;
}

/** Formato compacto da faixa de números da landing: 850 -> "850", 15000 -> "15k", 1.2M -> "1.2M". */
export function formatStat(value: number): string {
  if (value >= MILLION) return compact(value / MILLION, "M");
  if (value >= THOUSAND) return compact(value / THOUSAND, "k");
  return String(value);
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
