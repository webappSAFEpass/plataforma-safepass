import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-base font-normal whitespace-nowrap transition duration-150 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-button hover:bg-primary-strong",
        outline: "border bg-card text-primary hover:bg-success-soft",
        soft: "bg-success-soft text-primary hover:bg-accent",
        ghost: "text-primary hover:bg-muted",
        link: "rounded-md text-primary hover:text-primary-strong",
        cta: "bg-destructive text-destructive-foreground shadow-button hover:brightness-90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        lg: "h-14 px-6",
        icon: "size-9",
        inline: "h-auto p-0",
        pill: "h-9 rounded-full px-5",
        full: "h-11 w-full px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
