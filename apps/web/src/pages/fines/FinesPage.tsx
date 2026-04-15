import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FineEventsTable } from "@/components/fines/FineEventsTable";
import { FineDetailModal } from "@/components/fines/FineDetailModal";
import {
  approveFine,
  getFineEvents,
  rejectFine,
  type FineEvent,
} from "@/services/fine.service";

export function FinesPage() {
  const [fines, setFines] = useState<FineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFine, setSelectedFine] = useState<FineEvent | null>(null);

  async function loadFines() {
    setLoading(true);
    setError(null);
    try {
      const data = await getFineEvents();
      setFines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fine events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFines();
  }, []);

  async function handleApprove(fine: FineEvent) {
    setBusyId(fine.id);
    setError(null);
    try {
      await approveFine(fine.id);
      await loadFines();
      if (selectedFine?.id === fine.id) {
        setSelectedFine(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve fine.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(fine: FineEvent, notes: string) {
    setBusyId(fine.id);
    setError(null);
    try {
      await rejectFine(fine.id, notes);
      await loadFines();
      if (selectedFine?.id === fine.id) {
        setSelectedFine(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject fine.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Fine Events Dashboard</h1>
            <p className="text-sm text-gray-600">Review fine events and approve or reject pending actions.</p>
          </div>
          <Button className="bg-gray-200 text-gray-800" onClick={loadFines}>
            Refresh
          </Button>
        </header>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="rounded-2xl p-6 text-sm text-gray-600 shadow-md">Loading fine events...</Card>
        ) : (
          <FineEventsTable
            fines={fines}
            busyId={busyId}
            onView={setSelectedFine}
            onApprove={handleApprove}
            onReject={(fine) => setSelectedFine(fine)}
          />
        )}
      </div>

      <FineDetailModal
        fine={selectedFine}
        busy={Boolean(busyId)}
        onClose={() => setSelectedFine(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </main>
  );
}
