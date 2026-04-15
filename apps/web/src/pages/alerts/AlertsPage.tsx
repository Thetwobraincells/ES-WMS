import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertsList } from "@/components/alerts/AlertsList";
import { getAlerts, updateAlertStatus, type AlertItem, type AlertStatus } from "@/services/alerts.service";
import { RefreshCw } from "lucide-react";

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | AlertStatus>("");

  const types = useMemo(() => {
    return Array.from(new Set(alerts.map((item) => item.type)));
  }, [alerts]);

  async function loadAlerts() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlerts({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [typeFilter, statusFilter]);

  async function handleUpdate(alert: AlertItem, status: "RESOLVED" | "DISMISSED") {
    setBusyId(alert.id);
    setError(null);
    try {
      await updateAlertStatus(alert.id, status);
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update alert.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts Center</h1>
            <p className="text-sm text-gray-500">Monitor and action operational alerts</p>
          </div>
          <Button variant="secondary" onClick={loadAlerts}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              className="h-11 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              className="h-11 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | AlertStatus)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading alerts...</Card>
        ) : (
          <AlertsList
            alerts={alerts}
            busyId={busyId}
            onResolve={(alert) => handleUpdate(alert, "RESOLVED")}
            onDismiss={(alert) => handleUpdate(alert, "DISMISSED")}
          />
        )}
      </div>
    </main>
  );
}
