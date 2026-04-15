import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RoutesTable } from "@/components/routes/RoutesTable";
import { RouteFormModal } from "@/components/routes/RouteFormModal";
import { getWards, getVehicles, type Ward, type VehicleOption } from "@/services/admin.service";
import { getUsers, type UserRecord } from "@/services/user.service";
import {
  createRoute,
  deleteRoute,
  getRouteById,
  getRoutes,
  updateRoute,
  type RouteDetails,
  type RouteRecord,
  type Shift,
} from "@/services/route.service";

export function RoutesPage() {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<UserRecord[]>([]);
  const [supervisors, setSupervisors] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"" | Shift>("");
  const [wardFilter, setWardFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedRoute, setSelectedRoute] = useState<RouteDetails | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [routeData, wardData, vehicleData, driverData, supervisorData] = await Promise.all([
        getRoutes({ ward_id: wardFilter || undefined, shift: shiftFilter || undefined }),
        getWards(),
        getVehicles(),
        getUsers("DRIVER"),
        getUsers("SUPERVISOR"),
      ]);
      setRoutes(routeData);
      setWards(wardData);
      setVehicles(vehicleData);
      setDrivers(driverData.filter((user) => user.is_active));
      setSupervisors(supervisorData.filter((user) => user.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routes.");
    } finally {
      setLoading(false);
    }
  }, [shiftFilter, wardFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredRoutes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return routes;
    return routes.filter((route) => {
      const haystack = [
        route.ward?.name ?? "",
        route.vehicle?.registration_no ?? "",
        route.driver?.name ?? "",
        route.shift,
      ];
      return haystack.some((value) => value.toLowerCase().includes(query));
    });
  }, [routes, search]);

  async function handleModalSubmit(payload: {
    ward_id: string;
    vehicle_id: string;
    driver_id: string;
    supervisor_id?: string;
    shift: Shift;
    is_active: boolean;
  }) {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === "create") {
        await createRoute(payload);
      } else if (selectedRoute) {
        await updateRoute(selectedRoute.id, payload);
      }
      setModalOpen(false);
      setSelectedRoute(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save route.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Route Management</h1>
            <p className="text-sm text-gray-600">Create, edit, and maintain route assignments.</p>
          </div>
          <Button
            className="bg-[#2E7D32] text-white"
            onClick={() => {
              setModalMode("create");
              setSelectedRoute(null);
              setModalOpen(true);
            }}
          >
            Create Route
          </Button>
        </header>

        <Card className="rounded-2xl p-4 shadow-md">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm outline-none"
              placeholder="Search by ward, vehicle, driver..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={shiftFilter}
              onChange={(event) => setShiftFilter(event.target.value as "" | Shift)}
            >
              <option value="">All shifts</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={wardFilter}
              onChange={(event) => setWardFilter(event.target.value)}
            >
              <option value="">All wards</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
            <Button className="bg-gray-200 text-gray-800" onClick={loadAll}>
              Apply Filters
            </Button>
          </div>
        </Card>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">
            {error}
          </Card>
        ) : null}

        {loading ? (
          <Card className="rounded-2xl p-6 text-sm text-gray-600 shadow-md">Loading routes...</Card>
        ) : (
          <RoutesTable
            routes={filteredRoutes}
            onEdit={async (route) => {
              setModalMode("edit");
              setSaving(true);
              try {
                const detail = await getRouteById(route.id);
                setSelectedRoute(detail);
                setModalOpen(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load route details.");
              } finally {
                setSaving(false);
              }
            }}
            onDelete={async (route) => {
              const confirmed = window.confirm("Delete this route?");
              if (!confirmed) return;
              setSaving(true);
              setError(null);
              try {
                await deleteRoute(route.id);
                await loadAll();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete route.");
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </div>

      <RouteFormModal
        open={modalOpen}
        mode={modalMode}
        route={selectedRoute}
        wards={wards}
        vehicles={vehicles}
        drivers={drivers}
        supervisors={supervisors}
        loading={saving}
        onClose={() => {
          setModalOpen(false);
          setSelectedRoute(null);
        }}
        onSubmit={handleModalSubmit}
      />
    </main>
  );
}
