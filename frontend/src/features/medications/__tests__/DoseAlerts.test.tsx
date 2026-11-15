import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { addMedication, db } from "@/mocks/medical-records";

import { renderWithQuery } from "../../../../tests/render";
import { CHECK_INTERVAL_MS, DoseAlerts, REALERT_MS } from "../components/DoseAlerts";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 10, 15, 7, 59, 40));
});
afterEach(() => vi.useRealTimers());

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

it("avisa no horário, reavisa uma vez e registra a dose com Tomei", async () => {
  const med = addMedication({
    name: "Amoxicilina",
    dose: "500 mg",
    posology: "1x ao dia",
    duration_days: 1,
    first_dose: "08:00",
    start_date: "2026-11-15",
  });
  const { user } = renderWithQuery(<DoseAlerts />);
  await waitFor(() => expect(db.medications).toHaveLength(1));

  await tick(CHECK_INTERVAL_MS);
  expect(await screen.findByRole("alert")).toHaveTextContent("Amoxicilina 500 mg · 08:00");
  expect(screen.getByText("Seu tratamento termina hoje")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Fechar aviso" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  await tick(REALERT_MS);
  expect(await screen.findByRole("alert")).toHaveTextContent("Amoxicilina 500 mg · 08:00");

  await user.click(screen.getByRole("button", { name: "Tomei" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(db.doses.has(`${med.id} 2026-11-15 08:00`)).toBe(true);

  await tick(REALERT_MS + CHECK_INTERVAL_MS);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("não avisa dose já tomada", async () => {
  const med = addMedication({
    name: "Losartana",
    posology: "1x ao dia",
    first_dose: "08:00",
    start_date: "2026-11-15",
  });
  db.doses.add(`${med.id} 2026-11-15 08:00`);
  renderWithQuery(<DoseAlerts />);

  await tick(CHECK_INTERVAL_MS * 2);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
