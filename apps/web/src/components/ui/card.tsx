import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "gradient";

const variantClasses: Record<CardVariant, string> = {
  default: "bg-white border border-surface-border shadow-card",
  glass: "glass shadow-glass",
  gradient: "gradient-brand text-white shadow-card",
};

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl transition-shadow hover:shadow-card-hover",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
