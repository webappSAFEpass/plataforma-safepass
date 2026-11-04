import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { TeamList } from "../components/TeamList";

describe("TeamList", () => {
  it("remove um profissional da equipe", async () => {
    const { user } = renderWithUser(<TeamList />);

    await user.click(screen.getByRole("button", { name: "Remover Dr. Felipe Moraes" }));

    expect(screen.queryByText("Dr. Felipe Moraes")).not.toBeInTheDocument();
    expect(screen.getByText("2 pessoas com acesso à clínica.")).toBeInTheDocument();
  });

  it("não deixa remover a administradora principal", async () => {
    const { user } = renderWithUser(<TeamList />);

    await user.click(screen.getByRole("button", { name: "Remover Dra. Marina Duarte" }));

    expect(
      await screen.findByText("A administradora principal não pode ser removida."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Dra. Marina Duarte").length).toBeGreaterThan(0);
  });
});
