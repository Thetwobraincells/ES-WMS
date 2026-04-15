import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MassBalanceBars } from "@/components/reports/MassBalanceBars";
import { DiscrepancyChart } from "@/components/reports/DiscrepancyChart";
import { MassBalanceSankey } from "@/components/reports/MassBalanceSankey";
import { exportMassBalancePdf, getMassBalance } from "@/services/mass-balance.service";

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

      return {
        vehicle: vehicle.registration_no,
        collectedWeight,
        dumpedWeight,
        discrepancyPercent,
      };
    });
  }, [report]);

  const highDiscrepancyCount = rows.filter((row) => row.discrepancyPercent > 15).length;

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mass Balance Dashboard</h1>
            <p className="text-sm text-gray-600">Collected vs dumped waste monitoring and discrepancy flags.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="h-10 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Button className="bg-gray-200 text-gray-800" onClick={loadReport} disabled={loading}>
              {loading ? "Loading..." : "Load"}
            </Button>
            <Button className="bg-[#2E7D32] text-white" onClick={handleExportPdf} disabled={exporting || !report}>
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">{error}</Card>
        ) : null}

        {highDiscrepancyCount > 0 ? (
          <Card className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-md">
            Alert: {highDiscrepancyCount} vehicle(s) exceed 15% discrepancy threshold.
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl p-4 shadow-md">
            <p className="text-sm text-gray-600">Total Collected</p>
            <p className="text-2xl font-bold text-gray-900">
              {report ? `${Math.round(report.summary.total_collected_kg)} kg` : "-"}
            </p>
          </Card>
          <Card className="rounded-2xl p-4 shadow-md">
            <p className="text-sm text-gray-600">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900">
              {report ? `${Math.round(report.summary.total_capacity_kg)} kg` : "-"}
            </p>
          </Card>
          <Card className="rounded-2xl p-4 shadow-md">
            <p className="text-sm text-gray-600">Vehicles</p>
            <p className="text-2xl font-bold text-gray-900">{report ? report.summary.vehicle_count : "-"}</p>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card className="rounded-2xl p-4 shadow-md">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Collected vs Dumped</h2>
            <MassBalanceBars
              data={rows.map((row) => ({
                vehicle: row.vehicle,
                collected: Math.round(row.collectedWeight),
                dumped: Math.round(row.dumpedWeight),
              }))}
            />
          </Card>

          <Card className="rounded-2xl p-4 shadow-md">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Discrepancy %</h2>
            <DiscrepancyChart
              data={rows.map((row) => ({
                vehicle: row.vehicle,
                discrepancyPercent: row.discrepancyPercent,
              }))}
            />
          </Card>
        </section>

        <section>
          <Card className="rounded-2xl p-4 shadow-md">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Waste Flow Sankey</h2>
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
