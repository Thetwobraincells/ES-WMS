import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FineEvent } from "@/services/fine.service";

type FineEventsTableProps = {
  fines: FineEvent[];
  onView: (fine: FineEvent) => void;
  onApprove: (fine: FineEvent) => void;
  onReject: (fine: FineEvent) => void;
  busyId: string | null;
};

function statusClass(status: FineEvent["status"]) {
  if (status === "APPROVED") return "bg-green-100 text-green-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-orange-100 text-orange-700";
}

export function FineEventsTable({ fines, onView, onApprove, onReject, busyId }: FineEventsTableProps) {
  return (
    <Card className="rounded-2xl shadow-md">
      <div className="divide-y divide-gray-100">
        {fines.map((fine) => (
          <div key={fine.id} className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-orange-100 p-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
            </div>

            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onView(fine)}>
              <p className="truncate font-medium text-gray-900">
                {fine.society?.name ?? fine.society_id} - {fine.reason}
              </p>
              <p className="truncate text-sm text-gray-600">
                Stop: {fine.stop?.address ?? "N/A"} | Created: {new Date(fine.created_at).toLocaleString()}
              </p>
            </button>

            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">Rs {fine.amount.toFixed(2)}</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(fine.status)}`}>
                {fine.status}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                className="bg-[#2E7D32] text-white"
                onClick={() => onApprove(fine)}
                disabled={fine.status !== "PENDING" || busyId === fine.id}
              >
                Approve
              </Button>
              <Button
                className="bg-red-500 text-white"
                onClick={() => onReject(fine)}
                disabled={fine.status !== "PENDING" || busyId === fine.id}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}

        {fines.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">No fine events found.</p> : null}
      </div>
    </Card>
  );
}
