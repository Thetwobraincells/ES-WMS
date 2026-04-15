import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BacklogTable } from "@/components/backlog/BacklogTable";
import { getBacklogs, reassignBacklog, type BacklogItem } from "@/services/backlog.service";
import { getRoutes, type RouteRecord } from "@/services/route.service";

function priorityRank(priority?: string) {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
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
    () => [...items].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)),
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
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Backlog Queue</h1>
            <p className="text-sm text-gray-600">Sort by priority and reassign pending backlog stops.</p>
          </div>
          <Button className="bg-gray-200 text-gray-800" onClick={loadData}>
            Refresh
          </Button>
        </header>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">
            {error}
          </Card>
        ) : null}

        {loading ? (
          <Card className="rounded-2xl p-6 text-sm text-gray-600 shadow-md">Loading backlog queue...</Card>
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

      <Card className="sticky bottom-4 mx-auto mt-4 flex max-w-7xl items-center gap-3 rounded-2xl p-4 shadow-md">
        <div className="text-sm text-gray-700">
          {selectedIds.length} selected for bulk action
        </div>
        <select
          className="h-10 min-w-[220px] rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
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
          className="bg-[#2E7D32] text-white"
          disabled={saving || selectedIds.length === 0 || !selectedRouteId}
          onClick={() => handleReassign(selectedIds)}
        >
          {saving ? "Processing..." : "Reassign Selected"}
        </Button>
      </Card>
    </main>
  );
}
