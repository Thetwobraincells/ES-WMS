import { BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AlertItem } from "@/services/alerts.service";

type AlertsListProps = {
  alerts: AlertItem[];
  busyId: string | null;
  onResolve: (alert: AlertItem) => void;
  onDismiss: (alert: AlertItem) => void;
};

export function AlertsList({ alerts, busyId, onResolve, onDismiss }: AlertsListProps) {
  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Card key={alert.id} className="rounded-2xl shadow-md">
          <div className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-red-100 p-2 text-red-600">
              <BellRing className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{alert.type}</p>
              <p className="truncate text-sm text-gray-700">{alert.message}</p>
              <p className="text-xs text-gray-500">{new Date(alert.created_at).toLocaleString()}</p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                alert.status === "ACTIVE" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {alert.status}
            </span>

            <div className="flex gap-2">
              <Button
                className="bg-[#2E7D32] text-white"
                disabled={alert.status !== "ACTIVE" || busyId === alert.id}
                onClick={() => onResolve(alert)}
              >
                Resolve
              </Button>
              <Button
                className="bg-gray-300 text-gray-800"
                disabled={alert.status !== "ACTIVE" || busyId === alert.id}
                onClick={() => onDismiss(alert)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {alerts.length === 0 ? (
        <Card className="rounded-2xl p-6 text-center text-sm text-gray-500 shadow-md">No alerts found.</Card>
      ) : null}
    </div>
  );
}
