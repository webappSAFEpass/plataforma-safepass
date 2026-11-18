import type { Metadata } from "next";

import { AdminPlansPanel } from "@/features/admin/components/AdminPlansPanel";

export const metadata: Metadata = { title: "Planos — Admin SAFEpass" };

export default function AdminPlansPage() {
  return <AdminPlansPanel />;
}
