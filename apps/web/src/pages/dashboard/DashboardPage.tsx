import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Layers3, LocateFixed, Plus, Truck, TriangleAlert, MapPin, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardMap } from "@/components/dashboard/DashboardMap";
import { VehicleDetailPanel } from "@/components/dashboard/VehicleDetailPanel";
import { getLiveVehicles, type LiveVehicle } from "@/services/vehicle.service";
import { getStops, type MapStop } from "@/services/stop.service";
import { getDashboardSummary, type DashboardSummary } from "@/services/admin.service";

const statCards = [
  { key: "vehicles", label: "Active Vehicles", icon: Truck, gradient: "stat-card-1", color: "text-brand-700" },
  { key: "load", label: "Average Load", icon: Activity, gradient: "stat-card-2", color: "text-blue-700" },
  { key: "alerts", label: "Critical Alerts", icon: TriangleAlert, gradient: "stat-card-3", color: "text-amber-700" },
  { key: "stops", label: "Stops Tracked", icon: MapPin, gradient: "stat-card-4", color: "text-purple-700" },
] as const;

function StatCard({
  label,
  metric,
  icon: Icon,
  gradient,
  color,
}: {
  label: string;
  metric: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  color: string;
}) {
  return (
    <Card className={`${gradient} shine border-0 p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{label}</p>
          <p className={`mt-1 text-2xl font-bold ${color}`}>{metric}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 shadow-sm">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [stops, setStops] = useState<MapStop[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
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
      const [liveVehicles, stopList, dashboardSummary] = await Promise.all([
        getLiveVehicles(),
        getStops(),
        getDashboardSummary(),
      ]);
      setVehicles(liveVehicles);
      setStops(stopList);
      setSummary(dashboardSummary);
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

  const activeVehicles = summary ? summary.vehicles.active : vehicles.filter((v) => v.position).length;
  const fullOrHalted = vehicles.filter((v) => {
    const status = v.status.toLowerCase();
    return status.includes("full") || status.includes("halt");
  }).length;
  const averageLoad = vehicles.length
    ? `${Math.round(vehicles.reduce((acc, v) => acc + v.load_percent, 0) / vehicles.length)}%`
    : "0%";

  // Determine critical alerts: backlogs + fines, or fallback to full/halted
  const criticalAlerts = summary ? summary.backlogs.pending + summary.fines.pending : fullOrHalted;

  const metrics: Record<string, string> = {
    vehicles: `${activeVehicles}`,
    load: averageLoad,
    alerts: `${criticalAlerts}`,
    stops: summary ? `${summary.stops.total}` : `${stops.length}`,
  };

  return (
    <main className="min-h-screen bg-surface p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
        <p className="text-sm text-gray-500">Real-time fleet tracking and operational overview</p>
      </header>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            metric={metrics[card.key]}
            icon={card.icon}
            gradient={card.gradient}
            color={card.color}
          />
        ))}
      </section>

      {error ? (
        <Card className="mb-4 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      ) : null}

      {/* ── Map + Vehicle Panel ────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="relative overflow-hidden p-0">
          {/* Map label */}
          <div className="glass absolute left-4 top-4 z-[500] rounded-xl px-4 py-2 text-sm font-semibold text-gray-800 shadow-card">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Live Fleet Tracking
            </div>
          </div>

          {/* Map action buttons */}
          <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0 shadow-card"
              onClick={() => setShowStops((prev) => !prev)}
            >
              <Layers3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 w-10 rounded-full p-0 shadow-card"
              onClick={() => setCenterOnUser(true)}
            >
              <LocateFixed className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-10 w-10 rounded-full p-0 shadow-glow"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex h-[540px] items-center justify-center text-sm text-gray-500">
              Loading live map...
            </div>
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
