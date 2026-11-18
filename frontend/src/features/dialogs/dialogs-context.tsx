"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type DialogName = "login" | "register" | "feedback" | "referral";
export type RegisterAccountType = "user" | "provider" | "company";

export interface OpenDialogOptions {
  /** Nota pré-selecionada (estrelas do rodapé abrem o feedback já com a nota clicada). */
  rating?: number;
  /** Tipo de conta pré-selecionado (cards "Sou Usuário/Prestador/Empresa"). */
  accountType?: RegisterAccountType;
}

interface DialogsContextValue {
  active: DialogName | null;
  options: OpenDialogOptions;
  openDialog: (name: DialogName, options?: OpenDialogOptions) => void;
  closeDialog: () => void;
}

const DialogsContext = createContext<DialogsContextValue | null>(null);

export function DialogsProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<DialogName | null>(null);
  const [options, setOptions] = useState<OpenDialogOptions>({});

  const openDialog = useCallback((name: DialogName, next: OpenDialogOptions = {}) => {
    setOptions(next);
    setActive(name);
  }, []);
  const closeDialog = useCallback(() => setActive(null), []);

  const value = useMemo(
    () => ({ active, options, openDialog, closeDialog }),
    [active, options, openDialog, closeDialog],
  );
  return <DialogsContext.Provider value={value}>{children}</DialogsContext.Provider>;
}

export function useDialogs(): DialogsContextValue {
  const ctx = useContext(DialogsContext);
  if (!ctx) throw new Error("useDialogs precisa estar dentro de <DialogsProvider>.");
  return ctx;
}
