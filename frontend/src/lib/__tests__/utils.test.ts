import { describe, expect, it } from "vitest";

import { cn, formatCents, formatStat } from "@/lib/utils";

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

describe("cn", () => {
  it("resolve conflitos de classes do Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
