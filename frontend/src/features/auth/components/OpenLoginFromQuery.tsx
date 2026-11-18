"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useDialogs } from "@/features/dialogs/dialogs-context";

/** O middleware redireciona visitantes para "/?login=1": aqui abrimos o pop-up de login. */
export function OpenLoginFromQuery() {
  const params = useSearchParams();
  const router = useRouter();
  const { openDialog } = useDialogs();
  const wantsLogin = params.get("login") === "1";

  useEffect(() => {
    if (!wantsLogin) return;
    openDialog("login");
    router.replace("/", { scroll: false });
  }, [wantsLogin, openDialog, router]);

  return null;
}
