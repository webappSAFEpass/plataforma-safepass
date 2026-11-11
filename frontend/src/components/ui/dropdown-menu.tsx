"use client";

import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align="end"
        sideOffset={8}
        className={cn(
          "z-50 min-w-52 rounded-xl border border-brand-blue-soft bg-white p-1.5 shadow-lg",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof MenuPrimitive.Item>) {
  return (
    <MenuPrimitive.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-brand-blue-soft/60",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-brand-blue-soft" />;
}
