import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SocietyRecord } from "@/services/society.service";

type SocietyTableProps = {
  societies: SocietyRecord[];
};

function walletVariant(balance: number) {
  if (balance >= 8000) return "success" as const;
  if (balance >= 4000) return "warning" as const;
  return "danger" as const;
}

export function SocietyTable({ societies }: SocietyTableProps) {
  if (societies.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-gray-500">
        No societies found.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Society</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Ward</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Wallet Balance</th>
            </tr>
          </thead>
          <tbody>
            {societies.map((society) => (
              <tr
                key={society.id}
                className="border-b border-surface-border transition-colors hover:bg-surface-hover"
              >
                <td className="px-5 py-3.5">
                  <div>
                    <p className="font-medium text-gray-900">{society.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400 truncate max-w-[280px]">{society.address}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant="info">{society.ward?.name ?? "—"}</Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div>
                    <p className="text-gray-700">{society.contact_name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{society.contact_mobile ?? ""}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Badge variant={walletVariant(society.wallet_balance)}>
                    ₹{society.wallet_balance.toLocaleString()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
