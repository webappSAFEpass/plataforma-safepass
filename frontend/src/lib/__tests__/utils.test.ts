import { describe, expect, it } from "vitest";

import {
  cn,
  formatCents,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  formatRating,
  formatStat,
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

describe("formatStat", () => {
  it("mantém números pequenos como estão", () => {
    expect(formatStat(0)).toBe("0");
    expect(formatStat(850)).toBe("850");
  });

  it("abrevia milhares com k, sem casa decimal inútil", () => {
    expect(formatStat(15000)).toBe("15k");
    expect(formatStat(2400)).toBe("2.4k");
  });

  it("abrevia milhões com M", () => {
    expect(formatStat(1_200_000)).toBe("1.2M");
  });
});

describe("formatCents", () => {
  it("formata centavos em reais (pt-BR)", () => {
    expect(formatCents(4990).replace(/\s/g, " ")).toBe("R$ 49,90");
    expect(formatCents(9700).replace(/\s/g, " ")).toBe("R$ 97,00");
  });
});
