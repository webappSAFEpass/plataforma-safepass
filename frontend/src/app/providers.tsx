"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { LoginDialog } from "@/features/auth/components/LoginDialog";
import { RegisterDialog } from "@/features/auth/components/RegisterDialog";
import { DialogsProvider } from "@/features/dialogs/dialogs-context";
import { FeedbackDialog } from "@/features/platform-reviews/components/FeedbackDialog";
import { ReferralDialog } from "@/features/referrals/components/ReferralDialog";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );

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
