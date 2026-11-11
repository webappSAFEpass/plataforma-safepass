"use client";

import { Button } from "@/components/ui/button";
import { useDialogs } from "@/features/dialogs/dialogs-context";

export function ReferralBanner() {
  const { openDialog } = useDialogs();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-blue px-8 py-7">
      <div>
        <h3 className="font-display text-xl font-bold text-white">Conhece um excelente profissional?</h3>
        <p className="text-sm text-white/70">Indique para a plataforma e comece a pontuar agora mesmo!</p>
      </div>
      <Button variant="red" onClick={() => openDialog("referral")}>
        Indique Aqui Agora
      </Button>
    </div>
  );
}
