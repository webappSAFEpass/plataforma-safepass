import type { Metadata } from "next";

import { AdminDashboardPanel } from "@/features/admin/components/AdminDashboardPanel";

export const metadata: Metadata = { title: "Visão geral — Admin SAFEpass" };

export default function AdminHome() {
  return <AdminDashboardPanel />;
}
