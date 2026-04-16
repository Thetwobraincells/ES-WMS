import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { getBacklogs, reassignBacklog, type BacklogItem } from "@/services/backlog.service";
import { getRoutes, type RouteRecord } from "@/services/route.service";
import { RefreshCw } from "lucide-react";

function priorityRank(priority?: import("@/services/backlog.service").BacklogPriority) {
  if (!priority) return 0;
  return priority.urgency_score;
}

export function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [backlogData, routeData] = await Promise.all([getBacklogs(), getRoutes()]);
      setItems(backlogData);
      setRoutes(routeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backlog queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority)),
    [items],
  );

  async function handleReassign(ids: string[]) {
    if (!selectedRouteId || ids.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all(ids.map((id) => reassignBacklog(id, selectedRouteId)));
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign backlog entries.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backlog Queue</h1>
            <p className="text-sm text-gray-500">Sort by priority and reassign pending backlog stops</p>
          </div>
          <Button variant="secondary" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading backlog queue...</Card>
        ) : (
          <BacklogTable
            items={sortedItems}
            selectedIds={selectedIds}
            onSelect={(id, checked) =>
              setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((itemId) => itemId !== id)))
            }
            onSelectAll={(checked) => setSelectedIds(checked ? sortedItems.map((item) => item.id) : [])}
            onReassignOne={(id) => {
              if (!selectedRouteId) {
                setError("Select a route in the bulk action bar before reassigning.");
                return;
              }
              handleReassign([id]);
            }}
          />
        )}
      </div>

      {/* Sticky bulk-action bar */}
      <Card className="glass sticky bottom-4 mx-auto mt-5 flex max-w-7xl items-center gap-3 p-4">
        <div className="text-sm font-medium text-gray-700">
          <span className="font-bold text-brand-600">{selectedIds.length}</span> selected
        </div>
        <select
          className="h-10 min-w-[220px] rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
          value={selectedRouteId}
          onChange={(event) => setSelectedRouteId(event.target.value)}
        >
          <option value="">Select route for reassignment</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.ward?.name ?? route.ward_id} - {route.shift} - {route.vehicle?.registration_no ?? route.vehicle_id}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          disabled={saving || selectedIds.length === 0 || !selectedRouteId}
          onClick={() => handleReassign(selectedIds)}
        >
          {saving ? "Processing..." : "Reassign Selected"}
        </Button>
      </Card>
    </main>
  );
}
