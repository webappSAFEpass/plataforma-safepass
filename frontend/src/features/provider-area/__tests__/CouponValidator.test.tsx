import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { CouponValidator } from "../components/CouponValidator";

describe("CouponValidator", () => {
  it("confirma o benefício quando o código é válido", async () => {
    const { user } = renderWithUser(<CouponValidator />);

    await user.type(screen.getByLabelText("Código do benefício"), "bemestar15");
    await user.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/Benefício válido/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Confirmar uso/ }));
    expect(await screen.findByText("Uso confirmado com sucesso.")).toBeInTheDocument();
    expect(screen.getByLabelText("Código do benefício")).toHaveValue("");
  });

  it("avisa quando o código não é reconhecido", async () => {
    const { user } = renderWithUser(<CouponValidator />);

    await user.type(screen.getByLabelText("Código do benefício"), "INVALIDO");
    await user.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText("Não foi possível validar este código")).toBeInTheDocument();
  });

  it("pede o código quando o campo está vazio", async () => {
    const { user } = renderWithUser(<CouponValidator />);

    await user.click(screen.getByRole("button", { name: "Validar" }));

    expect(
      await screen.findByText("Digite o código apresentado pelo paciente."),
    ).toBeInTheDocument();
  });
});
