import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-transparent bg-gray-100 px-3 text-sm text-gray-900 outline-none ring-[#2E7D32]/30 placeholder:text-gray-500 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
