import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { AddDocument } from "@/features/medical-records";

export const metadata: Metadata = { title: "Adicionar documento" };

export default function AddDocumentPage() {
  return (
    <>
      <PageTitle
        eyebrow="Documentos"
        title="Adicionar documento"
        description="Envie a foto da receita para a IA ler, digite a receita ou guarde outro documento."
      />
      <AddDocument />
    </>
  );
}
