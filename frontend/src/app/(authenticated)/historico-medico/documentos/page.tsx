import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { DocumentList } from "@/features/medical-records";

export const metadata: Metadata = { title: "Documentos" };

export default function DocumentsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Histórico médico"
        title="Documentos"
        description="Receitas, exames, consultas, vacinas e atestados organizados por pessoa."
      />
      <DocumentList />
    </>
  );
}
