import { Save } from "lucide-react";
import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { PROFILE_FORM_ID, ProfileForm, ProfileHeader } from "@/features/provider-area";

export const metadata: Metadata = { title: "Meu perfil" };

export default function ProviderProfilePage() {
  return (
    <>
      <PageTitle
        eyebrow="Cadastro do prestador"
        title="Meu perfil"
        description="Mantenha os dados da sua clínica sempre atualizados."
        action={
          <Button type="submit" form={PROFILE_FORM_ID}>
            <Save aria-hidden="true" /> Salvar alterações
          </Button>
        }
      />
      <ProfileHeader />
      <ProfileForm />
    </>
  );
}
