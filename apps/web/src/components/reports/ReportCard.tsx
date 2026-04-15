import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReportCardProps = {
  title: string;
  description: string;
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
  onCsv,
  onPdf,
  csvDisabled,
  pdfDisabled,
  loadingCsv,
  loadingPdf,
}: ReportCardProps) {
  return (
    <Card className="rounded-2xl p-4 shadow-md">
      <div className="mb-3 flex items-start gap-2">
        <div className="rounded-full bg-[#E8F5E9] p-2 text-[#2E7D32]">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="border border-gray-300 bg-white text-gray-700"
          onClick={onCsv}
          disabled={csvDisabled || loadingCsv}
        >
          {loadingCsv ? "Exporting..." : "CSV"}
        </Button>
        <Button className="bg-[#2E7D32] text-white" onClick={onPdf} disabled={pdfDisabled || loadingPdf}>
          {loadingPdf ? "Exporting..." : "PDF"}
        </Button>
      </div>
    </Card>
  );
}
