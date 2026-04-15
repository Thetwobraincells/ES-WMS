import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SocietyTable } from "@/components/societies/SocietyTable";
import { getSocieties, type SocietyRecord } from "@/services/society.service";
import { getWards, type Ward } from "@/services/admin.service";
import { RefreshCw, Search } from "lucide-react";

export function SocietiesPage() {
  const [societies, setSocieties] = useState<SocietyRecord[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [societyData, wardData] = await Promise.all([getSocieties(), getWards()]);
      setSocieties(societyData);
      setWards(wardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load societies.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = societies;
    if (wardFilter) {
      result = result.filter((s) => s.ward_id === wardFilter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.address.toLowerCase().includes(query) ||
          (s.contact_name?.toLowerCase().includes(query) ?? false),
      );
    }
    return result;
  }, [societies, wardFilter, search]);

  const totalBalance = filtered.reduce((sum, s) => sum + s.wallet_balance, 0);

  return (
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Societies</h1>
            <p className="text-sm text-gray-500">Manage housing societies, wallets, and compliance</p>
          </div>
          <Button variant="secondary" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </header>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="stat-card-1 shine border-0 p-5">
            <p className="text-xs font-medium text-gray-600">Total Societies</p>
            <p className="mt-1 text-2xl font-bold text-brand-700">{filtered.length}</p>
          </Card>
          <Card className="stat-card-2 shine border-0 p-5">
            <p className="text-xs font-medium text-gray-600">Total Wallet Balance</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">₹{totalBalance.toLocaleString()}</p>
          </Card>
          <Card className="stat-card-3 shine border-0 p-5">
            <p className="text-xs font-medium text-gray-600">Wards Covered</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{wards.length}</p>
          </Card>
        </section>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="h-11 w-full rounded-xl border border-surface-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
                placeholder="Search by name, address, contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="h-11 rounded-xl border border-surface-border bg-surface px-3 text-sm outline-none focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/20"
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
            >
              <option value="">All wards</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading societies...</Card>
        ) : (
          <SocietyTable societies={filtered} />
        )}
      </div>
    </main>
  );
}
