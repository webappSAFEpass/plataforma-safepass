import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { CouponsManager } from "../components/CouponsManager";

describe("CouponsManager", () => {
  it("cria um benefício novo e atualiza a contagem de ativos", async () => {
    const { user } = renderWithUser(<CouponsManager />);

    await user.click(screen.getByRole("button", { name: /Criar benefício/ }));

    expect(await screen.findByText("Benefício criado e pronto para divulgar.")).toBeInTheDocument();
    expect(screen.getByText("EQUILIBRIO20")).toBeInTheDocument();
    expect(screen.getByText("20% em todos os serviços")).toBeInTheDocument();
    const active = screen.getByText("Benefícios ativos").parentElement!;
    expect(within(active).getByText("3")).toBeInTheDocument();
  });

  it("não cria benefício com código repetido", async () => {
    const { user } = renderWithUser(<CouponsManager />);
    const code = screen.getByLabelText("Código do benefício");

    await user.clear(code);
    await user.type(code, "BEMESTAR15");
    await user.click(screen.getByRole("button", { name: /Criar benefício/ }));

    expect(await screen.findByText("Já existe um benefício com esse código.")).toBeInTheDocument();
  });

  it("valida os campos antes de criar", async () => {
    const { user } = renderWithUser(<CouponsManager />);

    await user.clear(screen.getByLabelText("Código do benefício"));
    await user.clear(screen.getByLabelText("Limite de usos"));
    await user.type(screen.getByLabelText("Limite de usos"), "0");
    await user.click(screen.getByRole("button", { name: /Criar benefício/ }));

    expect(await screen.findByText("Informe o código do benefício.")).toBeInTheDocument();
    expect(screen.getByText("O limite precisa ser maior que zero.")).toBeInTheDocument();
  });

  it("copia o código do benefício", async () => {
    const { user } = renderWithUser(<CouponsManager />);

    await user.click(screen.getByRole("button", { name: "Copiar código BEMESTAR15" }));

    expect(await screen.findByText("Código copiado")).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe("BEMESTAR15");
  });
});
