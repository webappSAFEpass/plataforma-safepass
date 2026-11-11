import { describe, expect, it } from "vitest";

import {
  cn,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRating,
  initials,
} from "../utils";

describe("cn", () => {
  it("junta classes e deixa a última vencer em conflito do Tailwind", () => {
    expect(cn("px-2 text-sm", false, "px-4")).toBe("text-sm px-4");
  });
});

describe("formatadores pt-BR", () => {
  it("formata moeda em reais sem centavos", () => {
    expect(formatCurrency(180)).toMatch(/^R\$\s180$/);
  });

  it("mostra 'Sem custo' para serviço gratuito", () => {
    expect(formatCurrency(0)).toBe("Sem custo");
  });

  it("usa ponto como separador de milhar", () => {
    expect(formatNumber(1284)).toBe("1.284");
  });

  it("usa vírgula na nota média", () => {
    expect(formatRating(4.9)).toBe("4,9");
  });

  it("converte razão em porcentagem", () => {
    expect(formatPercent(0.82)).toBe("82%");
  });

  it("formata data ISO sem deslocar o dia pelo fuso", () => {
    expect(formatDate("2026-06-30")).toBe("30 de jun. de 2026");
  });
});

describe("initials", () => {
  it("ignora títulos como Dra.", () => {
    expect(initials("Dra. Marina Duarte")).toBe("MD");
  });

  it("usa no máximo duas iniciais", () => {
    expect(initials("Ana Clara Ribeiro")).toBe("AC");
  });
});
