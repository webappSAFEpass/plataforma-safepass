import { Download } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { ToastButton } from "@/components/ui/toast-button";
import { BenefitsOverview } from "@/features/company-area";

export const metadata: Metadata = { title: "Benefícios" };

export default function CompanyBenefitsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Benefícios corporativos"
        title="Programa SAFEpass"
        description="Visibilidade para o bem-estar que sua empresa oferece."
        action={
          <ToastButton
            variant="outline"
            message="Relatório preparado"
            description="O demonstrativo de benefícios será baixado em breve."
          >
            <Download aria-hidden="true" /> Exportar relatório
          </ToastButton>
        }
      />
      <BenefitsOverview />
    </>
  );
}
