import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { MedicalOverview, NEW_DOCUMENT_HREF } from "@/features/medical-records";

export const metadata: Metadata = { title: "Histórico médico" };

export default function MedicalRecordsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Histórico médico"
        title="Sua saúde em um lugar"
        description="Documentos, medicamentos, vacinas e lembretes seus e dos seus dependentes."
        action={
          <Button asChild>
            <Link href={NEW_DOCUMENT_HREF}>
              <Plus aria-hidden="true" /> Adicionar documento
            </Link>
          </Button>
        }
      />
      <MedicalOverview />
    </>
  );
}
