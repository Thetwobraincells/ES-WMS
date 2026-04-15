import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type ReportCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  onCsv: () => Promise<void> | void;
  onPdf: () => Promise<void> | void;
  csvDisabled?: boolean;
  pdfDisabled?: boolean;
  loadingCsv?: boolean;
  loadingPdf?: boolean;
};

export function ReportCard({
  title,
  description,
  icon,
  onCsv,
  onPdf,
  csvDisabled,
  pdfDisabled,
  loadingCsv,
  loadingPdf,
}: ReportCardProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={onCsv}
          disabled={csvDisabled || loadingCsv}
          className="text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          {loadingCsv ? "Exporting..." : "CSV"}
        </Button>
        <Button
          variant="primary"
          onClick={onPdf}
          disabled={pdfDisabled || loadingPdf}
          className="text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          {loadingPdf ? "Exporting..." : "PDF"}
        </Button>
      </div>
    </Card>
  );
}
