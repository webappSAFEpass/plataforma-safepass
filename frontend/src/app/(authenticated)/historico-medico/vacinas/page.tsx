import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { VaccineList } from "@/features/medications";

export const metadata: Metadata = { title: "Vacinas" };

export default function VaccinesPage() {
  return (
    <>
      <PageTitle
        eyebrow="Histórico médico"
        title="Vacinas"
        description="Doses aplicadas e as próximas, suas e dos seus dependentes."
      />
      <VaccineList />
    </>
  );
}
