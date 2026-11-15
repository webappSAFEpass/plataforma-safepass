import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../../tests/render";
import { UserMenu } from "../components/UserMenu";
import type { User } from "../types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const user = (role: User["role"]): User => ({
  id: "u1",
  email: "ana@exemplo.com",
  full_name: "Ana Souza",
  role,
});

describe("UserMenu", () => {
  it("leva o usuário final ao histórico médico", async () => {
    const { user: ui } = renderWithQuery(<UserMenu user={user("user")} />);

    await ui.click(screen.getByRole("button", { name: "Menu da conta de Ana Souza" }));

    expect(await screen.findByRole("menuitem", { name: /Histórico médico/ })).toHaveAttribute(
      "href",
      "/historico-medico",
    );
    expect(screen.getByRole("menuitem", { name: /Meu Dashboard/ })).toHaveAttribute(
      "href",
      "/painel",
    );
  });

  it("mostra o painel administrativo ao admin, sem o histórico médico", async () => {
    const { user: ui } = renderWithQuery(<UserMenu user={user("admin")} />);

    await ui.click(screen.getByRole("button", { name: "Menu da conta de Ana Souza" }));

    expect(
      await screen.findByRole("menuitem", { name: /Painel administrativo/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Histórico médico/ })).not.toBeInTheDocument();
  });
});
