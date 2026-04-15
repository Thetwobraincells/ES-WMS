import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FineEvent } from "@/services/fine.service";

type FineDetailModalProps = {
  fine: FineEvent | null;
  busy: boolean;
  onClose: () => void;
  onApprove: (fine: FineEvent) => Promise<void>;
  onReject: (fine: FineEvent, notes: string) => Promise<void>;
};

export function FineDetailModal({ fine, busy, onClose, onApprove, onReject }: FineDetailModalProps) {
  const [notes, setNotes] = useState("");

  if (!fine) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl rounded-xl p-6 shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Fine Event Details</h3>
          <Button type="button" className="bg-gray-200 text-gray-800" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-medium text-gray-900">Society:</span> {fine.society?.name ?? fine.society_id}</p>
            <p><span className="font-medium text-gray-900">Amount:</span> Rs {fine.amount.toFixed(2)}</p>
            <p><span className="font-medium text-gray-900">Reason:</span> {fine.reason}</p>
            <p><span className="font-medium text-gray-900">Status:</span> {fine.status}</p>
            <p><span className="font-medium text-gray-900">Stop:</span> {fine.stop?.address ?? "N/A"}</p>
            <p><span className="font-medium text-gray-900">Created:</span> {new Date(fine.created_at).toLocaleString()}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-900">Photo Preview</p>
            {fine.photo_url ? (
              <img
                src={fine.photo_url}
                alt="Fine evidence"
                className="h-48 w-full rounded-lg border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                No photo available
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <textarea
            className="min-h-[90px] w-full rounded-lg border border-transparent bg-gray-100 p-3 text-sm outline-none"
            placeholder="Reject notes (required for reject action)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              className="bg-[#2E7D32] text-white"
              disabled={busy || fine.status !== "PENDING"}
              onClick={() => onApprove(fine)}
            >
              Approve
            </Button>
            <Button
              className="bg-red-500 text-white"
              disabled={busy || fine.status !== "PENDING" || !notes.trim()}
              onClick={() => onReject(fine, notes.trim())}
            >
              Reject
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
