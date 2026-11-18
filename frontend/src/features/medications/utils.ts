import { formatDate } from "@/lib/utils";

import type { Dependent, Medication, Reminder } from "./types";

const ISO_DATE_LOCALE = "sv-SE"; // formata como AAAA-MM-DD

/** Data de hoje no fuso do navegador, em AAAA-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return now.toLocaleDateString(ISO_DATE_LOCALE);
}

/** Padrão da 1ª dose: a próxima hora cheia (23:30 → amanhã às 00:00). */
export function nextFullHour(now: Date = new Date()): { date: string; time: string } {
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return { date: todayISO(next), time: next.toTimeString().slice(0, 5) };
}

/** "08:30" → 510 */
export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

export function medicationStatus(med: Medication, today: string = todayISO()): string {
  if (med.active) return "Ativo";
  if (med.ended_on) return "Encerrado";
  return med.start_date > today ? `Começa em ${formatDate(med.start_date)}` : "Período terminado";
}

export function medicationPeriod(med: Medication): string {
  if (!med.duration_days) return "Uso contínuo";
  const days = med.duration_days === 1 ? "1 dia" : `${med.duration_days} dias`;
  return `${days} desde ${formatDate(med.start_date)}`;
}

/** "Eu" para o próprio usuário; senão o nome do dependente. */
export function ownerName(dependentId: string | null, dependents: Dependent[]): string {
  if (!dependentId) return "Eu";
  return dependents.find((d) => d.id === dependentId)?.name ?? "Dependente";
}

/**
 * Doses de medicamento que venceram entre a última verificação e agora (em minutos do dia) e
 * ainda não foram tomadas. `since` = -1 recomeça da meia-noite (virada do dia).
 */
export function dueReminders(reminders: Reminder[], since: number, now: number): Reminder[] {
  return reminders.filter((r) => {
    if (r.kind !== "medication" || !r.time || r.taken) return false;
    const at = minutesOf(r.time);
    return since < at && at <= now;
  });
}

export function reminderLabel(r: Pick<Reminder, "name" | "dose">): string {
  return [r.name, r.dose].filter(Boolean).join(" ");
}
