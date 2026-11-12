import { Download } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { ToastButton } from "@/components/ui/toast-button";
import { CertificatesManager } from "@/features/company-area";

export const metadata: Metadata = { title: "Atestados" };

export default function CertificatesPage() {
  return (
    <>
      <PageTitle
        eyebrow="Saúde ocupacional"
        title="Atestados médicos"
        description="Envie, acompanhe e mantenha os documentos organizados."
        action={
          <ToastButton variant="outline" message="Exportação agendada">
            <Download aria-hidden="true" /> Exportar planilha
          </ToastButton>
        }
      />
      <CertificatesManager />
    </>
  );
}
