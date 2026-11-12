import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { ToastButton } from "@/components/ui/toast-button";
import { provider, TeamInviteCard, TeamList } from "@/features/provider-area";

export const metadata: Metadata = { title: "Equipe" };

export default function ProviderTeamPage() {
  return (
    <>
      <PageTitle
        eyebrow="Gestão de equipe"
        title="Sua equipe"
        description={`Profissionais vinculados à ${provider.clinic}.`}
        action={
          <ToastButton
            message="Convite preparado"
            description="O link de convite foi copiado para a área de transferência."
          >
            <UserPlus aria-hidden="true" /> Convidar profissional
          </ToastButton>
        }
      />
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <TeamList />
        <TeamInviteCard />
      </section>
    </>
  );
}
