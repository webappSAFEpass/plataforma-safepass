import { AppShell } from "@/components/layout/AppShell";
import { ChatWidget } from "@/features/assistant";

// Área logada: header + sidebar + o assistente SAFEpass (squad 48) em todas as telas.
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <ChatWidget />
    </>
  );
}
