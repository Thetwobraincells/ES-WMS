import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Bell, Layers3, LocateFixed, Plus, Truck, TriangleAlert, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMap } from "@/components/dashboard/DashboardMap";
import { VehicleDetailPanel } from "@/components/dashboard/VehicleDetailPanel";
import { getLiveVehicles, type LiveVehicle } from "@/services/vehicle.service";
import { getStops, type MapStop } from "@/services/stop.service";

function OverviewCard({
  title,
  metric,
  icon,
}: {
  title: string;
  metric: string;
  icon: ReactNode;
}) {
  return (
    <Card className="rounded-2xl p-4 shadow-md">
      <div className="mb-2 flex items-center gap-2 text-gray-600">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{metric}</p>
    </Card>
  );
}

export function DashboardPage() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [stops, setStops] = useState<MapStop[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showStops, setShowStops] = useState(false);
  const [centerOnUser, setCenterOnUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [liveVehicles, stopList] = await Promise.all([getLiveVehicles(), getStops()]);
      setVehicles(liveVehicles);
      setStops(stopList);
      if (!selectedVehicleId && liveVehicles.length > 0) {
        setSelectedVehicleId(liveVehicles[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(fetchData, 30000);
    return () => window.clearInterval(timer);
  }, [fetchData]);

  const activeVehicles = vehicles.filter((v) => v.position).length;
  const fullOrHalted = vehicles.filter((v) => {
    const status = v.status.toLowerCase();
    return status.includes("full") || status.includes("halt");
  }).length;
  const averageLoad = vehicles.length
    ? `${Math.round(vehicles.reduce((acc, v) => acc + v.load_percent, 0) / vehicles.length)}%`
    : "0%";

  return (
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Good Morning, Admin</h1>
          <p className="text-sm text-gray-600">Real-time command center overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-full bg-white p-3 shadow-md transition hover:opacity-90"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-700" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5E9] font-semibold text-[#2E7D32] shadow-md">
            A
          </div>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard title="Active Vehicles" metric={`${activeVehicles}`} icon={<Truck className="h-4 w-4" />} />
        <OverviewCard title="Average Load" metric={averageLoad} icon={<Layers3 className="h-4 w-4" />} />
        <OverviewCard title="Critical Alerts" metric={`${fullOrHalted}`} icon={<TriangleAlert className="h-4 w-4" />} />
        <OverviewCard title="Stops Tracked" metric={`${stops.length}`} icon={<Users className="h-4 w-4" />} />
      </section>

      {error ? (
        <Card className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 shadow-md">
          {error}
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="relative overflow-hidden rounded-2xl shadow-md">
          <div className="absolute left-4 top-4 z-[500] rounded-lg bg-white/90 px-3 py-2 text-sm font-medium text-gray-900 shadow-md">
            Live Fleet Tracking
          </div>

          <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
            <Button
              type="button"
              className="rounded-full bg-white p-3 text-gray-700 shadow-md hover:opacity-90"
              onClick={() => setShowStops((prev) => !prev)}
            >
              <Layers3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              className="rounded-full bg-white p-3 text-gray-700 shadow-md hover:opacity-90"
              onClick={() => setCenterOnUser(true)}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
            <Button type="button" className="rounded-full bg-[#2E7D32] p-3 text-white shadow-md hover:opacity-95">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex h-[520px] items-center justify-center text-sm text-gray-600">Loading live map...</div>
          ) : (
            <DashboardMap
              vehicles={vehicles}
              stops={stops}
              selectedVehicleId={selectedVehicleId}
              showStops={showStops}
              onSelectVehicle={setSelectedVehicleId}
              centerOnUser={centerOnUser}
              onCentered={() => setCenterOnUser(false)}
            />
          )}
        </Card>

        <VehicleDetailPanel vehicle={selectedVehicle} />
      </section>
    </main>
  );
}
