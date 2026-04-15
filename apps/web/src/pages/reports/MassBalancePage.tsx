import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MassBalanceBars } from "@/components/reports/MassBalanceBars";
import { DiscrepancyChart } from "@/components/reports/DiscrepancyChart";
import { MassBalanceSankey } from "@/components/reports/MassBalanceSankey";
import { exportMassBalancePdf, getMassBalance } from "@/services/mass-balance.service";
import { Download, TriangleAlert } from "lucide-react";

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function MassBalancePage() {
  const [date, setDate] = useState(todayIsoDate());
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Awaited<ReturnType<typeof getMassBalance>> | null>(null);

  const rows = useMemo(() => {
    if (!report) return [];
    return report.vehicles.map((vehicle) => {
      const collectedWeight = vehicle.collected_weight ?? vehicle.peak_load_kg;
      const dumpedWeight = vehicle.dumped_weight ?? vehicle.peak_load_kg;
      const discrepancyPercent =
        collectedWeight > 0 ? Math.abs(((collectedWeight - dumpedWeight) / collectedWeight) * 100) : 0;
      return { vehicle: vehicle.registration_no, collectedWeight, dumpedWeight, discrepancyPercent };
    });
  }, [report]);

  const highDiscrepancyCount = rows.filter((row) => row.discrepancyPercent > 15).length;

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const data = await getMassBalance(date);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mass balance data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setError(null);
    try {
      const blob = await exportMassBalancePdf(date);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mass-balance-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mass Balance</h1>
            <p className="text-sm text-gray-500">Collected vs dumped waste monitoring and discrepancy flags</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="h-10 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Button variant="secondary" onClick={loadReport} disabled={loading}>
              {loading ? "Loading..." : "Load"}
            </Button>
            <Button variant="primary" onClick={handleExportPdf} disabled={exporting || !report}>
              <Download className="h-4 w-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {highDiscrepancyCount > 0 ? (
          <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <span>
              <strong>{highDiscrepancyCount}</strong> vehicle(s) exceed 15% discrepancy threshold.
            </span>
          </Card>
        ) : null}

        {/* Summary stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="stat-card-1 border-0 p-5 shine">
            <p className="text-xs font-medium text-gray-600">Total Collected</p>
            <p className="mt-1 text-2xl font-bold text-brand-700">
              {report ? `${Math.round(report.summary.total_collected_kg).toLocaleString()} kg` : "-"}
            </p>
          </Card>
          <Card className="stat-card-2 border-0 p-5 shine">
            <p className="text-xs font-medium text-gray-600">Total Capacity</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">
              {report ? `${Math.round(report.summary.total_capacity_kg).toLocaleString()} kg` : "-"}
            </p>
          </Card>
          <Card className="stat-card-4 border-0 p-5 shine">
            <p className="text-xs font-medium text-gray-600">Vehicles</p>
            <p className="mt-1 text-2xl font-bold text-purple-700">{report ? report.summary.vehicle_count : "-"}</p>
          </Card>
        </section>

        {/* Charts */}
        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">Collected vs Dumped</h2>
            <MassBalanceBars
              data={rows.map((row) => ({
                vehicle: row.vehicle,
                collected: Math.round(row.collectedWeight),
                dumped: Math.round(row.dumpedWeight),
              }))}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">Discrepancy %</h2>
            <DiscrepancyChart
              data={rows.map((row) => ({
                vehicle: row.vehicle,
                discrepancyPercent: row.discrepancyPercent,
              }))}
            />
          </Card>
        </section>

        <section>
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold text-gray-900">Waste Flow Sankey</h2>
            <MassBalanceSankey
              data={rows.map((row) => ({
                vehicle: row.vehicle,
                collected: Math.round(row.collectedWeight),
                dumped: Math.round(row.dumpedWeight),
              }))}
            />
          </Card>
        </section>
      </div>
    </main>
  );
}
