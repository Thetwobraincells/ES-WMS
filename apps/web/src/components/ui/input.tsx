import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className, label, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const input = (
    <input
      id={inputId}
      className={cn(
        "h-11 w-full rounded-xl border border-surface-border bg-surface px-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all",
        "focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20 focus:bg-white",
        className,
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-gray-600">
        {label}
      </label>
      {input}
    </div>
  );
}
