import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700",
  secondary: "bg-surface-hover text-gray-700 border border-surface-border hover:bg-gray-200",
  ghost: "text-gray-600 hover:bg-surface-hover hover:text-gray-900",
  danger: "bg-red-50 text-red-700 border border-red-200/60 hover:bg-red-100",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
};

export function Button({ className, asChild, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  // If a variant is specified, use variant classes. Otherwise fall back to className-only for backwards compat.
  const variantClass = variant ? variantClasses[variant] : "";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className,
      )}
      {...props}
    />
  );
}
