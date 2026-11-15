"use client";

import { BellRing, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

import { useDose, useReminders } from "../hooks/useReminders";
import type { Reminder } from "../types";
import { dueReminders, minutesOf, reminderLabel } from "../utils";

export const CHECK_INTERVAL_MS = 30_000;
export const REALERT_MS = 15 * 60_000;
const LAST_DAY_MESSAGE = "Seu tratamento termina hoje";

type Alert = { id: number; reminder: Reminder; error?: string };

const doseKey = (r: Reminder) => `${r.medication_id} ${r.date} ${r.time}`;
const nowMinutes = () => minutesOf(new Date().toTimeString());

function notifyBrowser(r: Reminder) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const body = [`${reminderLabel(r)} · ${r.time}`, r.last_day && LAST_DAY_MESSAGE]
    .filter(Boolean)
    .join("\n");
  new Notification("Hora do medicamento", { body, tag: doseKey(r) }).onclick = () => window.focus();
}

/**
 * Avisa no horário de cada dose ainda não tomada e reavisa uma única vez 15 min depois, se não
 * houver resposta. O aviso dentro do app sempre aparece, porque é nele que fica o "Tomei".
 *
 * ponytail: só funciona com o SAFEpass aberto (o timer vive na aba) e notificação sem service
 * worker não aceita botões. Com app fechado: service worker + push disparado pelo backend.
 */
export function DoseAlerts() {
  const { data: reminders = [] } = useReminders(CHECK_INTERVAL_MS);
  const dose = useDose();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const latest = useRef(reminders);
  const lastCheck = useRef(nowMinutes());
  const realerts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    latest.current = reminders;
  }, [reminders]);

  useEffect(() => {
    const timers = realerts.current;

    const show = (r: Reminder, realert: boolean) => {
      notifyBrowser(r);
      setAlerts((prev) => [
        ...prev.filter((a) => doseKey(a.reminder) !== doseKey(r)),
        { id: Date.now() + Math.random(), reminder: r },
      ]);
      if (!realert) return;
      timers.set(
        doseKey(r),
        setTimeout(() => {
          timers.delete(doseKey(r));
          // Lista mais recente: dose marcada em outra tela não reavisa.
          const fresh = latest.current.find((x) => doseKey(x) === doseKey(r));
          if (fresh && !fresh.taken) show(fresh, false);
        }, REALERT_MS),
      );
    };

    const id = setInterval(() => {
      // Dispara o que venceu desde a última verificação: aguenta timer atrasado (aba em segundo
      // plano) sem repetir aviso. Se virou o dia, recomeça da meia-noite.
      const now = nowMinutes();
      const since = now < lastCheck.current ? -1 : lastCheck.current;
      lastCheck.current = now;
      dueReminders(latest.current, since, now).forEach((r) => show(r, true));
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(id);
      timers.forEach(clearTimeout);
    };
  }, []);

  const close = (id: number) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const took = ({ id, reminder: r }: Alert) =>
    dose.mutate(
      { dose: { medication_id: r.medication_id!, date: r.date, time: r.time! }, taken: true },
      {
        onSuccess: () => {
          clearTimeout(realerts.current.get(doseKey(r)));
          realerts.current.delete(doseKey(r));
          close(id);
        },
        onError: (error) =>
          setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, error: error.message } : a))),
      },
    );

  if (alerts.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-primary bg-card p-4 shadow-menu"
        >
          <IconTile icon={BellRing} tone="brand" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-primary">Hora do medicamento</p>
            <p className="mt-0.5 text-sm text-ink">
              {reminderLabel(alert.reminder)} · {alert.reminder.time}
            </p>
            {alert.reminder.last_day && (
              <p className="mt-1 text-xs font-bold text-primary">{LAST_DAY_MESSAGE}</p>
            )}
            {alert.error && <p className="mt-1 text-xs text-destructive">{alert.error}</p>}
            <Button size="sm" className="mt-3" onClick={() => took(alert)}>
              Tomei
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar aviso"
            onClick={() => close(alert.id)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  );
}
