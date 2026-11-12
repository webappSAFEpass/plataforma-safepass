import { describe, expect, it } from "vitest";

import { services } from "../data";
import { filterServices } from "../services";

describe("filterServices", () => {
  it("devolve tudo com busca vazia", () => {
    expect(filterServices(services, "   ")).toHaveLength(services.length);
  });

  it("ignora acentos e caixa", () => {
    expect(filterServices(services, "AVALIACAO").map((s) => s.name)).toEqual([
      "Avaliação psicológica",
    ]);
  });

  it("busca também pelo código", () => {
    expect(filterServices(services, "psi-02").map((s) => s.code)).toEqual(["PSI-02"]);
  });
});
