import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { MedicationList } from "@/features/medications";

export const metadata: Metadata = { title: "Medicamentos" };

export default function MedicationsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Histórico médico"
        title="Medicamentos"
        description="Tratamentos das receitas e cadastrados à mão, com os horários do dia."
      />
      <MedicationList />
    </>
  );
}
