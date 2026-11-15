import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { NotificationPermission, ReminderList } from "@/features/medications";

export const metadata: Metadata = { title: "Lembretes" };

export default function RemindersPage() {
  return (
    <>
      <PageTitle
        eyebrow="Histórico médico"
        title="Lembretes"
        description="As doses de hoje e as próximas vacinas. Marque Tomei quando tomar."
      />
      <div className="space-y-6">
        <NotificationPermission />
        <ReminderList />
      </div>
    </>
  );
}
