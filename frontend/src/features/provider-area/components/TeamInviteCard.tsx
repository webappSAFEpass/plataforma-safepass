import { ArrowUpRight, Mail, UserPlus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { ToastButton } from "@/components/ui/toast-button";

const INVITE_STEPS = [
  "Envie o convite por e-mail",
  "Profissional completa o cadastro",
  "Defina os serviços disponíveis",
];

export function TeamInviteCard() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-primary p-5 text-primary-foreground">
          <IconTile icon={UserPlus} tone="inverse" size="lg" className="mb-6" />
          <h3 className="font-display text-lg font-extrabold tracking-[-.04em]">
            Amplie sua equipe
          </h3>
          <p className="mt-2 text-xs leading-5 text-border">
            Convide profissionais e mantenha a agenda da sua clínica integrada.
          </p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-extrabold tracking-[.1em] text-primary uppercase">
            Como funciona
          </p>
          <ol className="mt-4 space-y-4">
            {INVITE_STEPS.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm font-semibold text-primary">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-[10px] font-extrabold">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <ToastButton variant="outline" className="mt-5 w-full" message="Convite preparado">
            <Mail aria-hidden="true" /> Enviar convite
          </ToastButton>
        </div>
      </Card>
      <Card className="p-5">
        <p className="text-xs font-bold text-primary">Precisa de ajuda com permissões?</p>
        <ToastButton
          variant="link"
          size="inline"
          className="mt-2"
          message="Níveis de acesso em breve"
        >
          Conheça os níveis de acesso <ArrowUpRight aria-hidden="true" />
        </ToastButton>
      </Card>
    </div>
  );
}
