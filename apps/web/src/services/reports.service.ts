import { apiRequest } from "@/services/api";
import { getMassBalance, exportMassBalancePdf } from "@/services/mass-balance.service";
import { getRoutes } from "@/services/route.service";
import { getAuthToken } from "@/services/session";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
}

export async function exportFineReport(format: "csv" | "pdf") {
  const token = getAuthToken();
  const response = await fetch(`${BASE_URL}/admin/fine-events/export?format=${format}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error("Failed to export fine report.");
  const blob = await response.blob();
  downloadBlob(blob, `fine-collection-report.${format}`);
}

export async function exportMassBalanceCsv(date: string) {
  const report = await getMassBalance(date);
  const blob = toCsv(
    ["Vehicle", "Collected Weight", "Dumped Weight", "Utilization %"],
    report.vehicles.map((item) => [
      item.registration_no,
      item.collected_weight ?? item.peak_load_kg,
      item.dumped_weight ?? item.peak_load_kg,
      item.utilization_percent,
    ]),
  );
  downloadBlob(blob, `mass-balance-${date}.csv`);
}

export async function exportMassBalancePdfReport(date: string) {
  const blob = await exportMassBalancePdf(date);
  downloadBlob(blob, `mass-balance-${date}.pdf`);
}

export async function exportDailyRouteCsv() {
  const routes = await getRoutes();
  const blob = toCsv(
    ["Route ID", "Ward", "Vehicle", "Driver", "Shift", "Stops", "Status"],
    routes.map((route) => [
      route.id,
      route.ward?.name ?? route.ward_id,
      route.vehicle?.registration_no ?? route.vehicle_id,
      route.driver?.name ?? route.driver_id,
      route.shift,
      route._count?.stops ?? 0,
      route.is_active ? "ACTIVE" : "INACTIVE",
    ]),
  );
  downloadBlob(blob, "daily-route-report.csv");
}

export async function exportComplaintResolutionCsv(date: string) {
  const data = await apiRequest<{
    date: string;
    societies: { complaints_today: number };
    routes: { active: number };
    stops: { completed: number; skipped: number };
  }>(`/admin/dashboard?date=${encodeURIComponent(date)}`);

  const blob = toCsv(
    ["Date", "Complaints Today", "Active Routes", "Completed Stops", "Skipped Stops"],
    [[data.date, data.societies.complaints_today, data.routes.active, data.stops.completed, data.stops.skipped]],
  );
  downloadBlob(blob, `complaint-resolution-${date}.csv`);
}
