import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { addVaccine, db, makeDependent } from "@/mocks/medical-records";

import { renderWithQuery } from "../../../../tests/render";
import { VaccineList } from "../components/VaccineList";

describe("VaccineList", () => {
  it("registra uma vacina com dono dependente e próxima dose", async () => {
    db.dependents = [makeDependent({ id: "d1", name: "Pedro", bond: "Filho" })];
    const { user } = renderWithQuery(<VaccineList />);

    await user.click(await screen.findByRole("button", { name: /Registrar vacina/ }));
    await user.type(screen.getByLabelText("Vacina"), "Influenza");
    await user.selectOptions(screen.getByLabelText("De quem é"), "d1");
    await user.clear(screen.getByLabelText("Aplicada em"));
    await user.type(screen.getByLabelText("Aplicada em"), "2026-11-01");
    await user.type(screen.getByLabelText("Próxima dose (opcional)"), "2027-11-01");
    await user.click(screen.getByRole("button", { name: "Registrar vacina" }));

    expect(await screen.findByText(/Próxima dose: 01 de nov. de 2027/)).toBeInTheDocument();
    expect(screen.getByText(/Pedro · aplicada em/)).toBeInTheDocument();
  });

  it("edita e exclui uma vacina", async () => {
    addVaccine({ name: "Hepatite B", applied_on: "2026-10-01" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user } = renderWithQuery(<VaccineList />);

    await user.click(await screen.findByRole("button", { name: "Editar" }));
    await user.type(screen.getByLabelText("Dose"), "2ª dose");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Hepatite B · 2ª dose")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText("Nenhuma vacina registrada ainda.")).toBeInTheDocument();
  });
});
