"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";

type Permission = NotificationPermission | "unsupported";

const MESSAGES: Record<Permission, string> = {
  granted: "Notificações ativas: o navegador também avisa no horário, com o SAFEpass aberto.",
  denied: "Notificações bloqueadas no navegador. Os avisos aparecem dentro do SAFEpass.",
  unsupported: "Este navegador não mostra notificações. Os avisos aparecem dentro do SAFEpass.",
  default: "Receba também a notificação do navegador no horário de cada dose.",
};

const currentPermission = (): Permission =>
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "unsupported";

/** Pede a permissão só no clique: o navegador bloqueia pedido feito no carregamento. */
export function NotificationPermission() {
  const [permission, setPermission] = useState<Permission>(currentPermission);

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <IconTile icon={BellRing} tone="brand" />
      <p className="min-w-48 flex-1 text-sm text-ink">{MESSAGES[permission]}</p>
      {permission === "default" && (
        <Button onClick={() => Notification.requestPermission().then(setPermission)}>
          Ativar notificações
        </Button>
      )}
    </Card>
  );
}
