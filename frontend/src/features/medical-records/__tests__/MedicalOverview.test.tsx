import { screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { addDocument, addMedication, db, makeDependent } from "@/mocks/medical-records";

import { renderWithQuery } from "../../../../tests/render";
import { MedicalOverview } from "../components/MedicalOverview";

it("resume documentos, medicamentos, doses de hoje e dependentes", async () => {
  db.dependents = [makeDependent({ id: "d1", name: "Pedro", bond: "Filho" })];
  addDocument({ title: "Hemograma completo", type: "exam" });
  addMedication({ name: "Dipirona", posology: "12/12h", first_dose: "09:00", dependent_id: "d1" });
  renderWithQuery(<MedicalOverview />);

  expect(await screen.findByText("Hemograma completo")).toBeInTheDocument();
  expect(await screen.findByText(/Hoje 09:00/)).toBeInTheDocument();
  expect(screen.getAllByText("Dipirona")).not.toHaveLength(0);
  expect(screen.getByText("Doses de hoje").parentElement).toHaveTextContent("2");
});

it("mostra os estados vazios", async () => {
  renderWithQuery(<MedicalOverview />);
  expect(await screen.findByText("Nenhum documento ainda.")).toBeInTheDocument();
  expect(screen.getByText("Nenhum lembrete pendente hoje.")).toBeInTheDocument();
});
