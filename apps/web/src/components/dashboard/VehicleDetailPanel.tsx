import { Card } from "@/components/ui/card";
import type { LiveVehicle } from "@/services/vehicle.service";

type VehicleDetailPanelProps = {
  vehicle: LiveVehicle | null;
};

export function VehicleDetailPanel({ vehicle }: VehicleDetailPanelProps) {
  if (!vehicle) {
    return (
      <Card className="h-full p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Vehicle Details</h3>
        <p className="text-sm text-gray-500">Click a vehicle marker to view route and load information.</p>
      </Card>
    );
  }

  const loadPercent = vehicle.capacity_kg > 0
    ? Math.round((vehicle.current_load_kg / vehicle.capacity_kg) * 100)
    : 0;

  return (
    <Card className="h-full p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">Vehicle Details</h3>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-gray-500">Driver Name</dt>
          <dd className="font-medium text-gray-900">{vehicle.driver?.name ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Vehicle ID</dt>
          <dd className="font-medium text-gray-900">{vehicle.registration_no}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Load %</dt>
          <dd className="font-medium text-gray-900">{loadPercent}%</dd>
        </div>
        <div>
          <dt className="text-gray-500">Route Progress</dt>
          <dd className="font-medium text-gray-900">
            {vehicle.route_progress.completed}/{vehicle.route_progress.total}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Last Update</dt>
          <dd className="font-medium text-gray-900">
            {vehicle.last_update ? new Date(vehicle.last_update).toLocaleString() : "No telemetry"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
