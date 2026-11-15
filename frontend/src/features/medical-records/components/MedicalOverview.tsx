"use client";

import { BellRing, FileText, Pill, UsersRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  ownerName,
  reminderLabel,
  useDependents,
  useMedications,
  useReminders,
} from "@/features/medications";
import { formatDate } from "@/lib/utils";

import { useDocuments } from "../hooks/useDocuments";
import { documentTypeLabel } from "../utils";

import { DOCUMENTS_HREF } from "./OtherDocumentForm";

const RECENT_DOCUMENTS = 4;
const UPCOMING_REMINDERS = 5;
const REMINDERS_HREF = "/historico-medico/lembretes";

/** Início do histórico médico: contadores, documentos recentes e próximos lembretes. */
export function MedicalOverview() {
  const documents = useDocuments({ size: RECENT_DOCUMENTS });
  const medications = useMedications({ active: true });
  const reminders = useReminders();
  const { data: dependents = [] } = useDependents();
  const pending = (reminders.data ?? []).filter((r) => !r.taken);
  const pendingDoses = pending.filter((r) => r.kind === "medication").length;
  const count = (value: number | undefined) => (value === undefined ? "—" : String(value));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Documentos"
          value={count(documents.data?.total)}
          foot="no seu histórico"
        />
        <StatCard
          icon={Pill}
          label="Medicamentos"
          value={count(medications.data?.total)}
          foot="em uso agora"
        />
        <StatCard
          icon={BellRing}
          label="Doses de hoje"
          value={count(reminders.data && pendingDoses)}
          foot="ainda não tomadas"
          tone="warning"
        />
        <StatCard
          icon={UsersRound}
          label="Dependentes"
          value={String(dependents.length)}
          foot="na sua conta"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            icon={FileText}
            title="Documentos recentes"
            action={
              <Button variant="link" size="inline" asChild>
                <Link href={DOCUMENTS_HREF}>Ver todos</Link>
              </Button>
            }
          />
          {documents.data?.items.length ? (
            <ul className="divide-y">
              {documents.data.items.map((doc) => (
                <li key={doc.id} className="py-3">
                  <p className="font-semibold text-ink">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {documentTypeLabel(doc.type)} · {ownerName(doc.dependent_id, dependents)}
                    {doc.document_date && ` · ${formatDate(doc.document_date)}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum documento ainda.</p>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader
            icon={BellRing}
            title="Próximos lembretes"
            action={
              <Button variant="link" size="inline" asChild>
                <Link href={REMINDERS_HREF}>Ver todos</Link>
              </Button>
            }
          />
          {pending.length ? (
            <ul className="divide-y">
              {pending.slice(0, UPCOMING_REMINDERS).map((r) => (
                <li
                  key={`${r.medication_id ?? r.vaccine_id}-${r.time}`}
                  className="flex gap-4 py-3"
                >
                  <span className="w-24 shrink-0 font-semibold text-primary">
                    {r.time ? `Hoje ${r.time}` : formatDate(r.date)}
                  </span>
                  <span className="text-ink">
                    {reminderLabel(r)}
                    <span className="text-muted-foreground">
                      {" "}
                      · {ownerName(r.dependent_id, dependents)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum lembrete pendente hoje.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
