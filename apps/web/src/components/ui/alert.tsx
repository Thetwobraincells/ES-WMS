import * as React from "react";
import { cn } from "@/lib/utils";

export function InfoBanner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900",
        className,
      )}
      {...props}
    />
  );
}
