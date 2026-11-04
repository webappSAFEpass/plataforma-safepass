import { describe, expect, it } from "vitest";

import { areaFor, COMPANY_AREA, isActive, PROVIDER_AREA } from "../navigation";

describe("areaFor", () => {
  it("usa a área da empresa nas rotas /empresa", () => {
    expect(areaFor("/empresa/colaboradores")).toBe(COMPANY_AREA);
  });

  it("usa a área do prestador nas demais rotas", () => {
    expect(areaFor("/prestador/perfil")).toBe(PROVIDER_AREA);
  });
});

describe("isActive", () => {
  const [home, services] = PROVIDER_AREA.items;

  it("marca o painel só na própria rota", () => {
    expect(isActive(home!, PROVIDER_AREA, "/prestador")).toBe(true);
    expect(isActive(home!, PROVIDER_AREA, "/prestador/servicos")).toBe(false);
  });

  it("marca os demais itens também nas sub-rotas", () => {
    expect(isActive(services!, PROVIDER_AREA, "/prestador/servicos/novo")).toBe(true);
  });
});
