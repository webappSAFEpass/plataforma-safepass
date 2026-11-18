import type { Metadata } from "next";

import { AdminCatalogPanel } from "@/features/admin/components/AdminCatalogPanel";

export const metadata: Metadata = { title: "Cupons — Admin SAFEpass" };

export default function AdminCatalogPage() {
  return <AdminCatalogPanel kind="coupons" />;
}
