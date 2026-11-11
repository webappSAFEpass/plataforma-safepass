import type { Metadata } from "next";
import { Suspense } from "react";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Redefinir senha — SAFEpass" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="mb-8 font-display text-3xl font-bold text-brand-blue">Redefinir senha</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
