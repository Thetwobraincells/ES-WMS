import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BacklogItem, BacklogPriority } from "@/services/backlog.service";

type BacklogTableProps = {
  items: BacklogItem[];
  selectedIds: string[];
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onReassignOne: (id: string) => void;
};

function priorityClass(score: number) {
  if (score > 15) return { label: "HIGH", className: "bg-red-100 text-red-700 font-bold border-red-200" };
  if (score > 10) return { label: "MEDIUM", className: "bg-orange-100 text-orange-700 font-medium border-orange-200" };
  return { label: "LOW", className: "bg-green-100 text-green-700 font-medium border-green-200" };
}

export function BacklogTable({ items, selectedIds, onSelect, onSelectAll, onReassignOne }: BacklogTableProps) {
  const allChecked = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  return (
    <Card className="rounded-2xl shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={(e) => onSelectAll(e.target.checked)} />
              </th>
              <th className="px-4 py-3 font-medium">Backlog ID</th>
              <th className="px-4 py-3 font-medium">Original Stop</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const score = item.priority?.urgency_score ?? 0;
              const pill = priorityClass(score);
              return (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => onSelect(item.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-700">{item.original_stop_id}</td>
                  <td className="px-4 py-3 text-gray-700">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider ${pill.className}`}>
                      {pill.label} ({score})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Button className="bg-[#2E7D32] text-white" onClick={() => onReassignOne(item.id)}>
                      Reassign
                    </Button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No backlog entries found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
