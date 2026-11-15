import { describe, expect, it } from "vitest";

import { makeDependent } from "@/mocks/medical-records";

import type { Medication, Reminder } from "../types";
import {
  dueReminders,
  medicationPeriod,
  medicationStatus,
  minutesOf,
  nextFullHour,
  ownerName,
  reminderLabel,
  todayISO,
} from "../utils";

const med = (over: Partial<Medication> = {}): Medication => ({
  id: "m1",
  source: "manual",
  prescription_id: null,
  dependent_id: null,
  name: "Losartana",
  dose: "50 mg",
  posology: "1x ao dia",
  start_date: "2026-11-10",
  duration_days: null,
  first_dose: "08:00",
  ended_on: null,
  schedule: ["08:00"],
  active: true,
  created_at: "",
  updated_at: "",
  ...over,
});

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  kind: "medication",
  medication_id: "m1",
  vaccine_id: null,
  name: "Losartana",
  dose: "50 mg",
  dependent_id: null,
  date: "2026-11-15",
  time: "08:00",
  taken: false,
  last_day: false,
  ...over,
});

describe("nextFullHour", () => {
  it("sugere a próxima hora cheia do mesmo dia", () => {
    expect(nextFullHour(new Date(2026, 10, 15, 14, 20))).toEqual({
      date: "2026-11-15",
      time: "15:00",
    });
  });

  it("passa para o dia seguinte depois das 23h", () => {
    expect(nextFullHour(new Date(2026, 10, 15, 23, 30))).toEqual({
      date: "2026-11-16",
      time: "00:00",
    });
  });
});

describe("medicationStatus", () => {
  it("diferencia ativo, encerrado, futuro e terminado", () => {
    const today = "2026-11-15";
    expect(medicationStatus(med(), today)).toBe("Ativo");
    expect(medicationStatus(med({ active: false, ended_on: today }), today)).toBe("Encerrado");
    expect(medicationStatus(med({ active: false, start_date: "2026-12-01" }), today)).toMatch(
      /^Começa em/,
    );
    expect(medicationStatus(med({ active: false, duration_days: 3 }), today)).toBe(
      "Período terminado",
    );
  });
});

describe("medicationPeriod", () => {
  it("mostra a duração ou uso contínuo", () => {
    expect(medicationPeriod(med({ duration_days: 7 }))).toMatch(/^7 dias desde/);
    expect(medicationPeriod(med({ duration_days: 1 }))).toMatch(/^1 dia desde/);
    expect(medicationPeriod(med())).toBe("Uso contínuo");
  });
});

describe("ownerName", () => {
  const dependents = [makeDependent({ id: "d1", name: "Pedro", bond: "Filho" })];

  it("usa Eu para o próprio usuário e o nome do dependente", () => {
    expect(ownerName(null, dependents)).toBe("Eu");
    expect(ownerName("d1", dependents)).toBe("Pedro");
    expect(ownerName("outro", dependents)).toBe("Dependente");
  });
});

describe("dueReminders", () => {
  it("devolve as doses vencidas desde a última verificação e não tomadas", () => {
    const list = [
      reminder({ time: "07:59" }),
      reminder({ time: "08:00" }),
      reminder({ time: "08:00", medication_id: "m2", taken: true }),
      reminder({ kind: "vaccine", time: null, medication_id: null }),
    ];
    expect(dueReminders(list, minutesOf("07:59"), minutesOf("08:01"))).toEqual([list[1]]);
  });

  it("recomeça da meia-noite quando since é -1", () => {
    expect(dueReminders([reminder({ time: "00:00" })], -1, 0)).toHaveLength(1);
  });
});

it("todayISO e reminderLabel formatam como a interface espera", () => {
  expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  expect(reminderLabel({ name: "Dipirona", dose: "" })).toBe("Dipirona");
  expect(reminderLabel({ name: "Dipirona", dose: "1 g" })).toBe("Dipirona 1 g");
});
