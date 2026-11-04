import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { EmployeesManager } from "../components/EmployeesManager";

describe("EmployeesManager", () => {
  it("convida um colaborador novo", async () => {
    const { user } = renderWithUser(<EmployeesManager />);

    await user.click(screen.getByRole("button", { name: /Adicionar colaborador/ }));
    await user.type(screen.getByLabelText("Nome completo"), "Rita Souza");
    await user.type(screen.getByLabelText("E-mail corporativo"), "rita.souza@veredas.com");
    await user.type(screen.getByLabelText("Área"), "Jurídico");
    await user.click(screen.getByRole("button", { name: /Enviar convite/ }));

    expect(await screen.findByText("Convite enviado ao novo colaborador.")).toBeInTheDocument();
    expect(screen.getByText("Rita Souza")).toBeInTheDocument();
    expect(screen.getByText("5 pessoas registradas no benefício.")).toBeInTheDocument();
  });

  it("valida o formulário de convite", async () => {
    const { user } = renderWithUser(<EmployeesManager />);

    await user.click(screen.getByRole("button", { name: /Adicionar colaborador/ }));
    await user.type(screen.getByLabelText("E-mail corporativo"), "rita");
    await user.click(screen.getByRole("button", { name: /Enviar convite/ }));

    expect(await screen.findByText("Informe o nome do colaborador.")).toBeInTheDocument();
    expect(screen.getByText("Informe um e-mail corporativo válido.")).toBeInTheDocument();
  });

  it("não convida e-mail já cadastrado", async () => {
    const { user } = renderWithUser(<EmployeesManager />);

    await user.click(screen.getByRole("button", { name: /Adicionar colaborador/ }));
    await user.type(screen.getByLabelText("Nome completo"), "Caio");
    await user.type(screen.getByLabelText("E-mail corporativo"), "caio.nunes@veredas.com");
    await user.type(screen.getByLabelText("Área"), "TI");
    await user.click(screen.getByRole("button", { name: /Enviar convite/ }));

    expect(await screen.findByText("Esse e-mail já está cadastrado.")).toBeInTheDocument();
  });

  it("busca e remove colaboradores", async () => {
    const { user } = renderWithUser(<EmployeesManager />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar colaborador" }), "xyz");
    expect(screen.getByText(/Nenhum colaborador encontrado/)).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Buscar colaborador" }));
    await user.click(screen.getByRole("button", { name: "Remover Bianca Rocha" }));
    expect(screen.queryByText("Bianca Rocha")).not.toBeInTheDocument();
  });
});
