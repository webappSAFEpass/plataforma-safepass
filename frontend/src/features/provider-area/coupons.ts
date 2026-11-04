import type { Coupon } from "./types";

export type ValidationResult = { status: "valid" } | { status: "invalid" };

/** Normaliza o que o atendente digitou: sem espaços nas pontas e em maiúsculas. */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Compara o código digitado com o código válido (simula a resposta do backend). */
export function validateCouponCode(input: string, validCode: string): ValidationResult {
  return normalizeCouponCode(input) === validCode ? { status: "valid" } : { status: "invalid" };
}

export function couponUsageLabel(coupon: Coupon): string {
  return `${coupon.used}/${coupon.limit} usos`;
}

/** Adiciona o cupom novo sem duplicar códigos já existentes. */
export function addCoupon(list: Coupon[], coupon: Coupon): Coupon[] {
  const code = normalizeCouponCode(coupon.code);
  if (list.some((item) => item.code === code)) return list;
  return [...list, { ...coupon, code }];
}

/** "20% em todos os serviços" ou "R$ 30 em psicoterapia". */
export function couponLabel(
  discountType: "percent" | "fixed",
  value: number,
  service: string,
): string {
  const amount = discountType === "percent" ? `${value}%` : `R$ ${value}`;
  return `${amount} em ${service.toLocaleLowerCase("pt-BR")}`;
}
