import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RouteRecord } from "@/services/route.service";

type RoutesTableProps = {
  routes: RouteRecord[];
  onEdit: (route: RouteRecord) => void;
  onDelete: (route: RouteRecord) => void;
};

export function RoutesTable({ routes, onEdit, onDelete }: RoutesTableProps) {
  return (
    <Card className="rounded-2xl p-0 shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Ward</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Shift</th>
              <th className="px-4 py-3 font-medium">Stops</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id} className="border-t border-gray-100 transition-colors hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{route.ward?.name ?? route.ward_id}</td>
                <td className="px-4 py-3 text-gray-700">{route.vehicle?.registration_no ?? route.vehicle_id}</td>
                <td className="px-4 py-3 text-gray-700">{route.driver?.name ?? route.driver_id}</td>
                <td className="px-4 py-3 text-gray-700">{route.shift}</td>
                <td className="px-4 py-3 text-gray-700">{route._count?.stops ?? 0}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      route.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {route.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button className="bg-gray-900 text-white" onClick={() => onEdit(route)}>
                      Edit
                    </Button>
                    <Button className="bg-red-500 text-white" onClick={() => onDelete(route)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {routes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No routes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
