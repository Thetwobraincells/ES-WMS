import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";

type SettingsSectionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function SettingsSectionCard({ title, description, children }: SettingsSectionCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-l-4 border-brand-500 px-5 py-4">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}
