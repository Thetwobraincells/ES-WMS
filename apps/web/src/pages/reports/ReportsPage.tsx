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
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Reports Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="h-10 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
            <input
              type="date"
              className="h-10 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
            <Button className="bg-gray-200 text-gray-800" onClick={() => setError(null)}>
              Apply Filters
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">{error}</Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          <ReportCard
            title="Daily Route Report"
            description="Route assignment snapshot and completion context."
            onCsv={() => runExport("daily-route-csv", exportDailyRouteCsv)}
            onPdf={() => Promise.resolve()}
            loadingCsv={loading["daily-route-csv"]}
            pdfDisabled
          />

          <ReportCard
            title="Fine Collection Report"
            description="Monthly fine collection export for admin review."
            onCsv={() => runExport("fine-csv", async () => exportFineReport("csv"))}
            onPdf={() => runExport("fine-pdf", async () => exportFineReport("pdf"))}
            loadingCsv={loading["fine-csv"]}
            loadingPdf={loading["fine-pdf"]}
          />

          <ReportCard
            title="Mass Balance Report"
            description="Collected vs dumped weights and discrepancy checks."
            onCsv={() => runExport("mass-csv", async () => exportMassBalanceCsv(fromDate))}
            onPdf={() => runExport("mass-pdf", async () => exportMassBalancePdfReport(fromDate))}
            loadingCsv={loading["mass-csv"]}
            loadingPdf={loading["mass-pdf"]}
          />

          <ReportCard
            title="Complaint Resolution Report"
            description="Daily complaint and resolution summary export."
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
