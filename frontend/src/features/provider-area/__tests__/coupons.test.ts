import { describe, expect, it } from "vitest";

import {
  addCoupon,
  couponLabel,
  couponUsageLabel,
  normalizeCouponCode,
  validateCouponCode,
} from "../coupons";
import type { Coupon } from "../types";

const coupon: Coupon = {
  code: "BEMESTAR15",
  label: "15%",
  used: 38,
  limit: 50,
  validUntil: "2026-06-30",
};

describe("validateCouponCode", () => {
  it("aceita o código válido mesmo digitado em minúsculas e com espaços", () => {
    expect(validateCouponCode("  bemestar15 ", "BEMESTAR15")).toEqual({ status: "valid" });
  });

  it("recusa código diferente", () => {
    expect(validateCouponCode("OUTRO", "BEMESTAR15")).toEqual({ status: "invalid" });
  });
});

describe("normalizeCouponCode", () => {
  it("remove espaços e coloca em maiúsculas", () => {
    expect(normalizeCouponCode(" abc1 ")).toBe("ABC1");
  });
});

describe("addCoupon", () => {
  it("adiciona o cupom novo com o código normalizado", () => {
    const next = addCoupon([coupon], { ...coupon, code: "novo20" });
    expect(next.map((item) => item.code)).toEqual(["BEMESTAR15", "NOVO20"]);
  });

  it("devolve a mesma lista quando o código já existe", () => {
    const list = [coupon];
    expect(addCoupon(list, { ...coupon, code: "bemestar15" })).toBe(list);
  });
});

describe("rótulos", () => {
  it("mostra usos sobre o limite", () => {
    expect(couponUsageLabel(coupon)).toBe("38/50 usos");
  });

  it("descreve desconto percentual e fixo", () => {
    expect(couponLabel("percent", 20, "Todos os serviços")).toBe("20% em todos os serviços");
    expect(couponLabel("fixed", 30, "Psicoterapia")).toBe("R$ 30 em psicoterapia");
  });
});
