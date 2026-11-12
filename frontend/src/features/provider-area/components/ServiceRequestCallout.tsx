import { ArrowUpRight, Plus } from "lucide-react";

import { IconTile } from "@/components/ui/icon-tile";
import { ToastButton } from "@/components/ui/toast-button";

export function ServiceRequestCallout() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed bg-success-soft p-5 sm:flex sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <IconTile icon={Plus} tone="plain" size="lg" />
        <div>
          <h3 className="font-display font-extrabold tracking-[-.04em] text-primary">
            Não encontrou o serviço que oferece?
          </h3>
          <p className="mt-1 text-xs leading-5 text-primary">
            Solicite a inclusão de um procedimento para avaliação do time SAFEpass.
          </p>
        </div>
      </div>
      <ToastButton
        variant="link"
        size="inline"
        className="mt-4 sm:mt-0"
        message="Solicitação iniciada"
      >
        Fazer solicitação <ArrowUpRight aria-hidden="true" />
      </ToastButton>
    </div>
  );
}
