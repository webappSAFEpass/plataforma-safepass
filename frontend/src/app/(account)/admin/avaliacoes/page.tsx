import type { Metadata } from "next";

import { AdminReviewsPanel } from "@/features/admin/components/AdminReviewsPanel";

export const metadata: Metadata = { title: "Avaliações — Admin SAFEpass" };

export default function AdminReviewsPage() {
  return <AdminReviewsPanel />;
}
