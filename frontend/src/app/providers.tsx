"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import { LoginDialog } from "@/features/auth/components/LoginDialog";
import { RegisterDialog } from "@/features/auth/components/RegisterDialog";
import { DialogsProvider } from "@/features/dialogs/dialogs-context";
import { FeedbackDialog } from "@/features/platform-reviews/components/FeedbackDialog";
import { ReferralDialog } from "@/features/referrals/components/ReferralDialog";
import { env } from "@/lib/env";

const MOCKING = env.NEXT_PUBLIC_API_MOCKING === "enabled";
// msw/browser não existe no servidor: o worker só entra no bundle do navegador.
const MockWorker = dynamic(() => import("@/mocks/MockWorker"), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  // Com o mock ligado, só renderiza depois do worker do MSW pronto (senão a 1ª busca escapa).
  const [ready, setReady] = useState(!MOCKING);
  const [onMockReady] = useState(() => () => setReady(true));

  if (!ready) return MOCKING ? <MockWorker onReady={onMockReady} /> : null;

  return (
    <QueryClientProvider client={queryClient}>
      <DialogsProvider>
        {children}
        {/* Pop-ups globais: qualquer parte do site pode abri-los via useDialogs() */}
        <LoginDialog />
        <RegisterDialog />
        <FeedbackDialog />
        <ReferralDialog />
      </DialogsProvider>
    </QueryClientProvider>
  );
}
