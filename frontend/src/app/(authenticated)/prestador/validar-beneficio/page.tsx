import { Clock3, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { CouponValidator } from "@/features/provider-area";

export const metadata: Metadata = { title: "Validar benefício" };

export default function ValidateCouponPage() {
  return (
    <>
      <PageTitle
        eyebrow="Validação rápida"
        title="Validar benefício"
        description="Confirme o benefício apresentado antes de concluir o atendimento."
      />
      <section className="mx-auto max-w-3xl">
        <CouponValidator />
        <div className="mt-5 flex justify-center gap-8 text-xs font-semibold text-primary">
          <span>
            <Clock3 className="mr-1.5 inline size-4" aria-hidden="true" />
            Validação em segundos
          </span>
          <span>
            <HelpCircle className="mr-1.5 inline size-4" aria-hidden="true" />
            Precisa de ajuda?
          </span>
        </div>
      </section>
    </>
  );
}
