import type { Metadata } from "next";

import { DashboardPlaceholder } from "@/features/auth/components/DashboardPlaceholder";

export const metadata: Metadata = { title: "Meu Painel — SAFEpass" };

// O painel completo (pontos, dependentes, agenda...) é do Desafio 02 e substituirá esta página.
export default function DashboardPage() {
  return <DashboardPlaceholder />;
}
