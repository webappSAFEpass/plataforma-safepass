import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { ReviewList, ReviewsSummary } from "@/features/provider-area";

export const metadata: Metadata = { title: "Avaliações" };

export default function ProviderReviewsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Experiência do paciente"
        title="Avaliações recebidas"
        description="Acompanhe o que os clientes dizem sobre o seu atendimento."
      />
      <ReviewsSummary />
      <ReviewList />
    </>
  );
}
