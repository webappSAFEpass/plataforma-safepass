import { describe, expect, it } from "vitest";

import { employees } from "../data";
import { filterEmployees, inviteEmployee } from "../employees";

describe("filterEmployees", () => {
  it("busca por área ignorando acentos", () => {
    expect(filterEmployees(employees, "operacoes").map((e) => e.name)).toEqual(["André Martins"]);
  });

  it("devolve todos com busca vazia", () => {
    expect(filterEmployees(employees, "")).toHaveLength(employees.length);
  });
});

describe("inviteEmployee", () => {
  it("adiciona como convite enviado, com e-mail em minúsculas", () => {
    const next = inviteEmployee(employees, { name: "Rita", email: "Rita@Veredas.com", area: "RH" });
    expect(next.at(-1)).toEqual({
      name: "Rita",
      email: "rita@veredas.com",
      area: "RH",
      status: "invited",
    });
  });

  it("não duplica e-mail já cadastrado", () => {
    expect(
      inviteEmployee(employees, { name: "X", email: "caio.nunes@veredas.com", area: "TI" }),
    ).toBe(employees);
  });
});
