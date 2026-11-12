"use client";

import type { ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "./button";

type ToastButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  message: string;
  description?: string;
};

/** Botão de ação que, por enquanto, só confirma com um toast (ação ainda sem endpoint). */
export function ToastButton({ message, description, ...props }: ToastButtonProps) {
  return (
    <Button onClick={() => toast(message, description ? { description } : undefined)} {...props} />
  );
}
