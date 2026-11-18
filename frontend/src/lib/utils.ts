import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const LOCALE = "pt-BR";
const CURRENCY = "BRL";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat(LOCALE);
const decimalFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** R$ 180. Valor zero vira "Sem custo", como no catálogo SAFEpass. */
export function formatCurrency(value: number): string {
  return value === 0 ? "Sem custo" : currencyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 4,9 */
export function formatRating(value: number): string {
  return decimalFormatter.format(value);
}

/** 0.82 → 82% */
export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

/** "2026-06-30" → "30 de jun. de 2026" */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "Dra. Marina Duarte" → "MD" (ignora títulos como Dr./Dra.). */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => part && !part.endsWith("."))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const brlCents = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });

/** Formata centavos como moeda: 4990 -> "R$ 49,90". */
export function formatCents(cents: number): string {
  return brlCents.format(cents / 100);
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
