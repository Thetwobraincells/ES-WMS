import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LiveVehicle } from "@/services/vehicle.service";

type VehicleDetailPanelProps = {
  vehicle: LiveVehicle | null;
};

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s.includes("full")) return "danger" as const;
  if (s.includes("collecting")) return "success" as const;
  if (s.includes("returning")) return "info" as const;
  return "muted" as const;
}

export function VehicleDetailPanel({ vehicle }: VehicleDetailPanelProps) {
  if (!vehicle) {
    return (
      <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface">
          <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-700">Vehicle Details</h3>
        <p className="mt-1 text-xs text-gray-400">Click a vehicle marker to view details</p>
      </Card>
    );
  }

  const loadPercent = vehicle.capacity_kg > 0
    ? Math.round((vehicle.current_load_kg / vehicle.capacity_kg) * 100)
    : 0;

  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (circumference * Math.min(loadPercent, 100)) / 100;
  const gaugeColor = loadPercent >= 90 ? "#EF4444" : loadPercent >= 70 ? "#F59E0B" : "#2E7D32";

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Vehicle Details</h3>
        <Badge variant={statusVariant(vehicle.status)}>
          {vehicle.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* ── Load Gauge ────────────────────────────────── */}
      <div className="mx-auto mb-5 flex flex-col items-center">
        <div className="relative h-28 w-28">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              stroke="#E2E8F0" strokeWidth="8" fill="none"
            />
            <circle
              cx="50" cy="50" r="40"
              stroke={gaugeColor} strokeWidth="8" fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-900">{loadPercent}%</span>
            <span className="text-[10px] text-gray-400">LOAD</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {vehicle.current_load_kg.toLocaleString()} / {vehicle.capacity_kg.toLocaleString()} kg
        </p>
      </div>

      {/* ── Info Rows ─────────────────────────────────── */}
      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
          <dt className="text-gray-500">Driver</dt>
          <dd className="font-medium text-gray-900">{vehicle.driver?.name ?? "Unassigned"}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
          <dt className="text-gray-500">Vehicle ID</dt>
          <dd className="font-mono text-xs font-medium text-gray-900">{vehicle.registration_no}</dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
          <dt className="text-gray-500">Route Progress</dt>
          <dd className="font-medium text-gray-900">
            <span className="text-brand-600">{vehicle.route_progress.completed}</span>
            <span className="text-gray-400"> / {vehicle.route_progress.total}</span>
          </dd>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
          <dt className="text-gray-500">Last Update</dt>
          <dd className="text-xs font-medium text-gray-900">
            {vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : "No telemetry"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
