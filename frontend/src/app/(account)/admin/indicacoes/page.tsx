import type { Metadata } from "next";

import { AdminReferralsPanel } from "@/features/admin/components/AdminReferralsPanel";

export const metadata: Metadata = { title: "Indicações — Admin SAFEpass" };

export default function AdminReferralsPage() {
  return <AdminReferralsPanel />;
}
