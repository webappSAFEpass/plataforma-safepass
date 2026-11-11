import type { Metadata } from "next";

import { PageTitle } from "@/components/layout/PageTitle";
import { EmployeesManager } from "@/features/company-area";

export const metadata: Metadata = { title: "Colaboradores" };

export default function EmployeesPage() {
  return (
    <>
      <PageTitle
        eyebrow="Gestão de pessoas"
        title="Colaboradores"
        description="Organize quem tem acesso aos benefícios SAFEpass."
      />
      <EmployeesManager />
    </>
  );
}
