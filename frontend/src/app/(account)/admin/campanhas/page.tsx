import type { Metadata } from "next";

import { AdminCatalogPanel } from "@/features/admin/components/AdminCatalogPanel";

export const metadata: Metadata = { title: "Campanhas — Admin SAFEpass" };

export default function AdminCatalogPage() {
  return <AdminCatalogPanel kind="campaigns" />;
}
