import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportCard } from "@/components/reports/ReportCard";
import {
  exportComplaintResolutionCsv,
  exportDailyRouteCsv,
  exportFineReport,
  exportMassBalanceCsv,
  exportMassBalancePdfReport,
} from "@/services/reports.service";
import { FileText, Receipt, Scale, MessageSquare } from "lucide-react";

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

type LoadingState = {
  [key: string]: boolean;
};

export function ReportsPage() {
  const [fromDate, setFromDate] = useState(todayIsoDate());
  const [toDate, setToDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<LoadingState>({});

  async function runExport(key: string, fn: () => Promise<void>) {
    setError(null);
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export report.");
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Export operational data as CSV or PDF</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="h-10 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
            <Button variant="secondary" onClick={() => setError(null)}>
              Apply
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <ReportCard
            title="Daily Route Report"
            description="Route assignment snapshot and completion context."
            icon={<FileText className="h-5 w-5 text-brand-500" />}
            onCsv={() => runExport("daily-route-csv", exportDailyRouteCsv)}
            onPdf={() => Promise.resolve()}
            loadingCsv={loading["daily-route-csv"]}
            pdfDisabled
          />

          <ReportCard
            title="Fine Collection Report"
            description="Monthly fine collection export for admin review."
            icon={<Receipt className="h-5 w-5 text-amber-500" />}
            onCsv={() => runExport("fine-csv", async () => exportFineReport("csv"))}
            onPdf={() => runExport("fine-pdf", async () => exportFineReport("pdf"))}
            loadingCsv={loading["fine-csv"]}
            loadingPdf={loading["fine-pdf"]}
          />

          <ReportCard
            title="Mass Balance Report"
            description="Collected vs dumped weights and discrepancy checks."
            icon={<Scale className="h-5 w-5 text-blue-500" />}
            onCsv={() => runExport("mass-csv", async () => exportMassBalanceCsv(fromDate))}
            onPdf={() => runExport("mass-pdf", async () => exportMassBalancePdfReport(fromDate))}
            loadingCsv={loading["mass-csv"]}
            loadingPdf={loading["mass-pdf"]}
          />

          <ReportCard
            title="Complaint Resolution Report"
            description="Daily complaint and resolution summary export."
            icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
            onCsv={() => runExport("complaint-csv", async () => exportComplaintResolutionCsv(fromDate))}
            onPdf={() => Promise.resolve()}
            loadingCsv={loading["complaint-csv"]}
            pdfDisabled
          />
        </section>
      </div>
    </main>
  );
}
