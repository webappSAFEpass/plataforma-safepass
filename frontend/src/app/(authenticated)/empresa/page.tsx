import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { COMPANY_NAME, CompanyDashboard } from "@/features/company-area";

export const metadata: Metadata = { title: "Painel da Empresa" };

export default function CompanyDashboardPage() {
  return (
    <>
      <PageTitle
        eyebrow="Área da empresa"
        title={`Olá, ${COMPANY_NAME}`}
        description="Acompanhe a saúde e os benefícios do seu time."
      />
      <CompanyDashboard />
    </>
  );
}
