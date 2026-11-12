import { Plus } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { COUPON_FORM_ID, CouponsManager } from "@/features/provider-area";

export const metadata: Metadata = { title: "Benefícios" };

export default function ProviderCouponsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Gestão de benefícios"
        title="Benefícios de desconto"
        description="Crie incentivos exclusivos e acompanhe seus resgates."
        action={
          <Button asChild>
            <a href={`#${COUPON_FORM_ID}`}>
              <Plus aria-hidden="true" /> Criar novo benefício
            </a>
          </Button>
        }
      />
      <CouponsManager />
    </>
  );
}
