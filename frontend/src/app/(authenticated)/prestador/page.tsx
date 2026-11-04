import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { provider, ProviderDashboard } from "@/features/provider-area";

export const metadata: Metadata = { title: "Painel do Prestador" };

export default function ProviderDashboardPage() {
  return (
    <>
      <PageTitle
        eyebrow="Área do prestador"
        title={`Bom dia, ${provider.firstName}`}
        description="Aqui está um resumo da sua presença na SAFEpass."
      />
      <ProviderDashboard />
    </>
  );
}
