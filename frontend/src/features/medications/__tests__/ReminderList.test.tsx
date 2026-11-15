import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { addMedication, addVaccine, db } from "@/mocks/medical-records";

import { renderWithQuery } from "../../../../tests/render";
import { ReminderList } from "../components/ReminderList";
import { todayISO } from "../utils";

describe("ReminderList", () => {
  it("mostra o estado vazio", async () => {
    renderWithQuery(<ReminderList />);
    expect(await screen.findByText(/Nenhum lembrete para hoje/)).toBeInTheDocument();
  });

  it("marca e desfaz a dose com Tomei, mandando a data do horário", async () => {
    const med = addMedication({
      name: "Dipirona",
      dose: "1 g",
      posology: "12/12h",
      first_dose: "09:00",
    });
    const { user } = renderWithQuery(<ReminderList />);

    await user.click(await screen.findByRole("button", { name: "Tomei: Dipirona 1 g às 09:00" }));
    expect(await screen.findByText("Tomada")).toBeInTheDocument();
    expect(db.doses.has(`${med.id} ${todayISO()} 09:00`)).toBe(true);

    await user.click(screen.getByRole("button", { name: "Desfazer: Dipirona 1 g às 09:00" }));
    expect(
      await screen.findByRole("button", { name: "Tomei: Dipirona 1 g às 09:00" }),
    ).toBeInTheDocument();
    expect(db.doses.size).toBe(0);
  });

  it("lista as próximas vacinas e avisa o último dia do tratamento", async () => {
    addVaccine({ name: "Influenza", applied_on: "2026-01-01", next_dose_on: "2027-01-01" });
    addMedication({ name: "Amoxicilina", posology: "1x ao dia", duration_days: 1 });
    renderWithQuery(<ReminderList />);

    expect(await screen.findByText("Próximas vacinas")).toBeInTheDocument();
    expect(screen.getByText("01 de jan. de 2027")).toBeInTheDocument();
    expect(screen.getByText(/último dia do tratamento/)).toBeInTheDocument();
  });
});
