import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { ToastButton } from "@/components/ui/toast-button";
import { ServiceRequestCallout, ServicesTable } from "@/features/provider-area";

export const metadata: Metadata = { title: "Serviços" };

export default function ProviderServicesPage() {
  return (
    <>
      <PageTitle
        eyebrow="Catálogo de serviços"
        title="Serviços oferecidos"
        description="Gerencie os serviços disponíveis para beneficiários SAFEpass."
        action={
          <ToastButton
            message="Solicitação enviada"
            description="Vamos analisar a inclusão do novo serviço."
          >
            <Plus aria-hidden="true" /> Solicitar serviço
          </ToastButton>
        }
      />
      <ServicesTable />
      <ServiceRequestCallout />
    </>
  );
}
