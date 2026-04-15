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
import { RefreshCw } from "lucide-react";

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
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fine Events</h1>
            <p className="text-sm text-gray-500">Review, approve, or reject pending fine actions</p>
          </div>
          <Button variant="secondary" onClick={loadFines}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading fine events...</Card>
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
