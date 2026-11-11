import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        red: "bg-brand-red text-white hover:brightness-90",
        blue: "bg-brand-blue text-white hover:brightness-90",
        outline:
          "border-2 border-brand-blue/30 bg-white text-brand-blue hover:bg-brand-blue-soft/50",
        ghost: "text-brand-blue hover:bg-brand-blue-soft/50",
      },
      size: {
        md: "rounded-xl px-6 py-2.5 text-sm",
        pill: "rounded-full px-5 py-2 text-sm",
        full: "w-full rounded-xl px-6 py-3 text-sm",
      },
    },
    defaultVariants: { variant: "blue", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      {...(asChild ? {} : { type })}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { buttonVariants };
