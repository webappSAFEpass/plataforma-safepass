import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { addMedication, db } from "@/mocks/medical-records";
import { server } from "@/mocks/node";

import { renderWithQuery } from "../../../../tests/render";
import { MedicationList } from "../components/MedicationList";
import { todayISO } from "../utils";

describe("MedicationList", () => {
  it("mostra o estado vazio", async () => {
    renderWithQuery(<MedicationList />);
    expect(await screen.findByText(/Nenhum medicamento ainda/)).toBeInTheDocument();
  });

  it("cadastra um medicamento com a hora da 1ª dose e mostra os horários do dia", async () => {
    const { user } = renderWithQuery(<MedicationList />);

    await user.click(await screen.findByRole("button", { name: /Novo medicamento/ }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Medicamento"), "Dipirona");
    await user.type(within(dialog).getByLabelText("Posologia"), "12/12h");
    await user.type(within(dialog).getByLabelText("Por quantos dias?"), "5");
    await user.clear(within(dialog).getByLabelText("Hora da 1ª dose"));
    await user.type(within(dialog).getByLabelText("Hora da 1ª dose"), "21:00");
    await user.click(within(dialog).getByRole("button", { name: "Salvar medicamento" }));

    expect(await screen.findByText("21:00 · 09:00")).toBeInTheDocument();
    expect(db.medications[0]).toMatchObject({
      name: "Dipirona",
      first_dose: "21:00",
      duration_days: 5,
    });
  });

  it("exige duração ou uso contínuo", async () => {
    const { user } = renderWithQuery(<MedicationList />);

    await user.click(await screen.findByRole("button", { name: /Novo medicamento/ }));
    await user.type(screen.getByLabelText("Medicamento"), "Losartana");
    await user.click(screen.getByRole("button", { name: "Salvar medicamento" }));

    expect(
      await screen.findByText("Informe por quantos dias ou marque uso contínuo."),
    ).toBeInTheDocument();
    expect(db.medications).toHaveLength(0);
  });

  it("encerra e reabre um medicamento da receita", async () => {
    addMedication({ name: "Amoxicilina", posology: "8/8h", duration_days: 7 }, "rx-1");
    const { user } = renderWithQuery(<MedicationList />);

    await user.click(await screen.findByRole("button", { name: "Encerrar" }));
    expect(await screen.findByText("Encerrado")).toBeInTheDocument();
    expect(db.medications[0]?.ended_on).toBe(todayISO());

    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(await screen.findByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Da receita")).toBeInTheDocument();
  });

  it("edita um medicamento existente", async () => {
    addMedication({ name: "Losartana", posology: "1x ao dia" });
    const { user } = renderWithQuery(<MedicationList />);

    await user.click(await screen.findByRole("button", { name: "Editar" }));
    expect(screen.getByLabelText("Uso contínuo")).toBeChecked(); // sem duração = uso contínuo
    const name = screen.getByLabelText("Medicamento");
    await user.clear(name);
    await user.type(name, "Losartana potássica");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText(/Losartana potássica/)).toBeInTheDocument();
  });

  it("mostra erro com tentar novamente quando a API falha", async () => {
    server.use(http.get("*/api/v1/medications", () => HttpResponse.json({}, { status: 500 })));
    renderWithQuery(<MedicationList />);
    expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
