import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { ProfileForm } from "../components/ProfileForm";

function submit() {
  return screen.getByRole("button", { name: "Salvar" });
}

describe("ProfileForm", () => {
  it("salva o perfil válido", async () => {
    const { user } = renderWithUser(
      <>
        <ProfileForm />
        <button type="submit" form="provider-profile-form">
          Salvar
        </button>
      </>,
    );

    await user.click(submit());

    expect(await screen.findByText("Alterações salvas com sucesso")).toBeInTheDocument();
  });

  it("aponta e-mail inválido", async () => {
    const { user } = renderWithUser(
      <>
        <ProfileForm />
        <button type="submit" form="provider-profile-form">
          Salvar
        </button>
      </>,
    );

    const email = screen.getByLabelText("E-mail");
    await user.clear(email);
    await user.type(email, "marina@");
    await user.click(submit());

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });
});
