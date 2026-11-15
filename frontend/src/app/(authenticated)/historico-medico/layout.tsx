import type { ReactNode } from "react";

import { DoseAlerts } from "@/features/medications";

// Histórico médico (Squad 44): os avisos de dose valem em qualquer tela desta área.
export default function MedicalRecordsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DoseAlerts />
    </>
  );
}
