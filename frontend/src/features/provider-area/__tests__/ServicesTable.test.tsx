import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { ServicesTable } from "../components/ServicesTable";

describe("ServicesTable", () => {
  it("filtra os serviços pela busca", async () => {
    const { user } = renderWithUser(<ServicesTable />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar serviço" }), "casal");

    expect(screen.getByText("Psicoterapia de casal")).toBeInTheDocument();
    expect(screen.queryByText("Psicoterapia individual")).not.toBeInTheDocument();
  });

  it("mostra estado vazio quando nada corresponde", async () => {
    const { user } = renderWithUser(<ServicesTable />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar serviço" }), "odontologia");

    expect(screen.getByText(/Nenhum serviço encontrado/)).toBeInTheDocument();
  });

  it("liga e desliga a disponibilidade do serviço", async () => {
    const { user } = renderWithUser(<ServicesTable />);
    const toggle = screen.getByRole("switch", { name: "Disponibilidade de Avaliação psicológica" });

    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
  });
});
