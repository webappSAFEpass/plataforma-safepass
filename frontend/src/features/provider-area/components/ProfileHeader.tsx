import { BadgeCheck, Upload } from "lucide-react";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToastButton } from "@/components/ui/toast-button";

import { provider } from "../data";

// Foto do protótipo; vem do cadastro do prestador quando o endpoint existir.
const AVATAR_URL =
  "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=240&q=80";

export function ProfileHeader() {
  return (
    <Card className="mb-5 overflow-hidden">
      <div className="relative h-[118px] bg-primary">
        <div className="absolute -top-10 -right-6 size-44 rounded-full border-[22px] border-accent/15" />
        <div className="absolute bottom-0 left-0 h-1 w-40 bg-accent" />
      </div>
      <div className="relative flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
        <div className="-mt-11 shrink-0 rounded-full bg-card p-1.5 shadow-lg">
          <Image
            src={AVATAR_URL}
            alt={`Foto de ${provider.name}`}
            width={86}
            height={86}
            className="size-[86px] rounded-full object-cover ring-2 ring-white"
          />
        </div>
        <div className="sm:pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-[-.05em] text-primary">
              {provider.name}
            </h2>
            <Badge>
              <BadgeCheck aria-hidden="true" /> PERFIL VERIFICADO
            </Badge>
          </div>
          <p className="mt-1 text-sm font-medium text-primary">
            {provider.title} · {provider.registry}
          </p>
        </div>
        <ToastButton
          variant="ghost"
          size="sm"
          className="sm:mb-1 sm:ml-auto"
          message="Envio de foto em breve"
        >
          <Upload aria-hidden="true" /> Alterar foto
        </ToastButton>
      </div>
    </Card>
  );
}
