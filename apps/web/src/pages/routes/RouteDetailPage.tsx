import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getRouteById,
  updateRoute,
  addStopToRoute,
  removeStopFromRoute,
  type RouteDetails,
  type RouteStop,
  type BinType,
} from "@/services/route.service";
import { getSocieties, type SocietyRecord } from "@/services/society.service";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  MapPin,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Clock,
} from "lucide-react";

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [route, setRoute] = useState<RouteDetails | null>(null);
  const [societies, setSocieties] = useState<SocietyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add stop form
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopSocietyId, setNewStopSocietyId] = useState("");
  const [newStopBinType, setNewStopBinType] = useState<BinType>("MIXED");

  // Track pending changes for reorder
  const [localStops, setLocalStops] = useState<RouteStop[]>([]);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const loadRoute = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [routeData, societyData] = await Promise.all([
        getRouteById(id),
        getSocieties(),
      ]);
      setRoute(routeData);
      setLocalStops(routeData.stops);
      setSocieties(societyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRoute();
  }, [loadRoute]);

  // Auto-hide success message
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  // ── Add Stop ──────────────────────────────────────────────────────────────
  async function handleAddStop() {
    if (!route || !newStopSocietyId) return;
    setSaving(true);
    setError(null);
    try {
      const society = societies.find((s) => s.id === newStopSocietyId);
      if (!society) throw new Error("Society not found.");

      await addStopToRoute(route.id, {
        society_id: society.id,
        address: society.address,
        lat: society.lat,
        lng: society.lng,
        bin_type: newStopBinType,
        sequence_order: localStops.length + 1,
      });

      setSuccess(`Added "${society.name}" to route.`);
      setNewStopSocietyId("");
      setShowAddStop(false);
      await loadRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stop.");
    } finally {
      setSaving(false);
    }
  }

  // ── Remove Stop ───────────────────────────────────────────────────────────
  async function handleRemoveStop(stop: RouteStop) {
    if (!route) return;
    const confirmed = window.confirm(
      `Remove "${stop.society?.name ?? stop.address}" from this route?`
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await removeStopFromRoute(route.id, stop.id);
      setSuccess("Stop removed and sequence re-ordered.");
      await loadRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove stop.");
    } finally {
      setSaving(false);
    }
  }

  // ── Drag & Drop Reorder ───────────────────────────────────────────────────
  function handleDragStart(idx: number) {
    setDraggingIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === idx) return;

    const newStops = [...localStops];
    const [moved] = newStops.splice(draggingIdx, 1);
    newStops.splice(idx, 0, moved);
    setLocalStops(newStops);
    setDraggingIdx(idx);
    setHasUnsavedOrder(true);
  }

  function handleDragEnd() {
    setDraggingIdx(null);
  }

  // ── Save Reordered Stops ──────────────────────────────────────────────────
  async function handleSaveOrder() {
    if (!route) return;
    setSaving(true);
    setError(null);
    try {
      const reorderedStops = localStops.map((stop, idx) => ({
        id: stop.id,
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        bin_type: stop.bin_type,
        sequence_order: idx + 1,
        society_id: stop.society_id,
      }));

      await updateRoute(route.id, { stops: reorderedStops });
      setHasUnsavedOrder(false);
      setSuccess("Stop order updated. Driver app will reflect changes shortly.");
      await loadRoute();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save order.");
    } finally {
      setSaving(false);
    }
  }

  // ── Available societies (not already in route) ────────────────────────────
  const usedSocietyIds = new Set(localStops.map((s) => s.society_id).filter(Boolean));
  const availableSocieties = societies.filter((s) => !usedSocietyIds.has(s.id));

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading route details...</p>
        </div>
      </main>
    );
  }

  if (!route) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface p-6">
        <Card className="max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Route Not Found</h2>
          <p className="mt-1 text-sm text-gray-500">{error ?? "This route doesn't exist."}</p>
          <Button variant="primary" className="mt-4" onClick={() => navigate("/routes")}>
            <ArrowLeft className="h-4 w-4" /> Back to Routes
          </Button>
        </Card>
      </main>
    );
  }

  const completedCount = localStops.filter((s) => s.status === "COMPLETED").length;
  const skippedCount = localStops.filter((s) => s.status === "SKIPPED").length;
  const pendingCount = localStops.filter(
    (s) => s.status === "PENDING" || s.status === "IN_PROGRESS"
  ).length;

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/routes")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              Route — {route.driver?.name ?? "Unassigned"}
            </h1>
            <p className="text-sm text-gray-500">
              {route.ward?.name} · {route.shift} Shift ·{" "}
              {route.vehicle?.registration_no ?? "No vehicle"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              route.is_active
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {route.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatsCard
            icon={<MapPin className="h-5 w-5 text-blue-500" />}
            label="Total Stops"
            value={localStops.length}
            color="blue"
          />
          <StatsCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            label="Completed"
            value={completedCount}
            color="green"
          />
          <StatsCard
            icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
            label="Pending"
            value={pendingCount}
            color="yellow"
          />
          <StatsCard
            icon={<Trash2 className="h-5 w-5 text-red-500" />}
            label="Skipped"
            value={skippedCount}
            color="red"
          />
        </div>

        {/* Driver & Vehicle Info */}
        <Card className="grid gap-4 p-4 md:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Driver</p>
              <p className="text-sm font-semibold text-gray-900">{route.driver?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Vehicle</p>
              <p className="text-sm font-semibold text-gray-900">
                {route.vehicle?.registration_no ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Shift</p>
              <p className="text-sm font-semibold text-gray-900">
                {route.shift === "AM" ? "Morning (AM)" : "Evening (PM)"}
              </p>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        {error && (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        )}
        {success && (
          <Card className="border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</Card>
        )}

        {/* Stops Management */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Route Stops</h2>
              <p className="text-xs text-gray-500">
                Drag to reorder · Changes saved to DB and reflected in driver app
              </p>
            </div>
            <div className="flex gap-2">
              {hasUnsavedOrder && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setLocalStops(route.stops);
                      setHasUnsavedOrder(false);
                    }}
                    disabled={saving}
                  >
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                  <Button
                    className="bg-[#2E7D32] text-white"
                    onClick={handleSaveOrder}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Order"}
                  </Button>
                </>
              )}
              <Button
                variant="primary"
                onClick={() => setShowAddStop(!showAddStop)}
                disabled={saving}
              >
                <Plus className="h-4 w-4" /> Add Stop
              </Button>
            </div>
          </div>

          {/* Add Stop Inline Form */}
          {showAddStop && (
            <div className="border-b border-gray-100 bg-blue-50/50 px-4 py-3">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  value={newStopSocietyId}
                  onChange={(e) => setNewStopSocietyId(e.target.value)}
                >
                  <option value="">Select society...</option>
                  {availableSocieties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.address}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  value={newStopBinType}
                  onChange={(e) => setNewStopBinType(e.target.value as BinType)}
                >
                  <option value="WET">WET</option>
                  <option value="DRY">DRY</option>
                  <option value="MIXED">MIXED</option>
                </select>
                <div className="flex gap-2">
                  <Button
                    className="bg-[#2E7D32] text-white"
                    onClick={handleAddStop}
                    disabled={saving || !newStopSocietyId}
                  >
                    {saving ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddStop(false);
                      setNewStopSocietyId("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Stops List */}
          <div className="divide-y divide-gray-50">
            {localStops.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  No stops on this route. Add societies above.
                </p>
              </div>
            ) : (
              localStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  draggable={stop.status === "PENDING" || stop.status === "IN_PROGRESS"}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    draggingIdx === idx
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  } ${stop.status === "COMPLETED" ? "opacity-60" : ""}`}
                >
                  {/* Drag Handle */}
                  <div className="flex-shrink-0 cursor-move text-gray-300">
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Sequence # */}
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {idx + 1}
                  </div>

                  {/* Stop Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {stop.society?.name ?? "Unknown Society"}
                    </p>
                    <p className="truncate text-xs text-gray-500">{stop.address}</p>
                  </div>

                  {/* Bin Type */}
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      stop.bin_type === "WET"
                        ? "bg-green-100 text-green-700"
                        : stop.bin_type === "DRY"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {stop.bin_type}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      stop.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : stop.status === "SKIPPED"
                          ? "bg-red-100 text-red-700"
                          : stop.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {stop.status}
                  </span>

                  {/* Remove Button (only for PENDING stops) */}
                  {stop.status === "PENDING" && (
                    <button
                      onClick={() => handleRemoveStop(stop)}
                      disabled={saving}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove stop"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Help Banner */}
        <Card className="border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-900">How Route Sync Works</p>
              <p className="mt-1 text-xs text-blue-700">
                When you add, remove, or reorder stops here, changes are saved directly to the
                database. The driver app polls for updates every 30 seconds and will automatically
                show the latest route. You can also ask the driver to pull-to-refresh for immediate
                updates.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatsCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    yellow: "bg-yellow-50",
    red: "bg-red-50",
  };
  return (
    <Card className={`${bgMap[color] ?? "bg-gray-50"} p-4`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </Card>
  );
}
