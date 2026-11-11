import type { Metadata } from "next";

import { CheckoutPanel } from "@/features/subscriptions/components/CheckoutPanel";

export const metadata: Metadata = { title: "Contratar plano — SAFEpass" };

export default async function PlanCheckoutPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="mb-10 font-display text-3xl font-bold text-brand-blue">Contratar plano</h1>
      <CheckoutPanel planCode={code} />
    </div>
  );
}
