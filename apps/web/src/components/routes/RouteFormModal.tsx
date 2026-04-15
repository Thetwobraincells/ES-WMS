import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RouteDetails, Shift } from "@/services/route.service";
import type { Ward, VehicleOption } from "@/services/admin.service";
import type { UserRecord } from "@/services/user.service";

type RouteFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  route: RouteDetails | null;
  wards: Ward[];
  vehicles: VehicleOption[];
  drivers: UserRecord[];
  supervisors: UserRecord[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    ward_id: string;
    vehicle_id: string;
    driver_id: string;
    supervisor_id?: string;
    shift: Shift;
    is_active: boolean;
  }) => Promise<void>;
};

type FormState = {
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id: string;
  shift: Shift;
  is_active: boolean;
};

const defaultForm: FormState = {
  ward_id: "",
  vehicle_id: "",
  driver_id: "",
  supervisor_id: "",
  shift: "AM",
  is_active: true,
};

export function RouteFormModal({
  open,
  mode,
  route,
  wards,
  vehicles,
  drivers,
  supervisors,
  loading,
  onClose,
  onSubmit,
}: RouteFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [stops, setStops] = useState<RouteDetails["stops"]>([]);
  const [draggingStopId, setDraggingStopId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && route) {
      setForm({
        ward_id: route.ward_id,
        vehicle_id: route.vehicle_id,
        driver_id: route.driver_id,
        supervisor_id: route.supervisor_id ?? "",
        shift: route.shift,
        is_active: route.is_active,
      });
      setStops(route.stops);
      return;
    }
    setForm(defaultForm);
    setStops([]);
  }, [mode, open, route]);

  const orderedStops = useMemo(
    () => stops.map((stop, idx) => ({ ...stop, sequence_order: idx + 1 })),
    [stops],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-3xl rounded-xl p-6 shadow-md">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{mode === "create" ? "Create Route" : "Edit Route"}</h3>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit({
              ward_id: form.ward_id,
              vehicle_id: form.vehicle_id,
              driver_id: form.driver_id,
              supervisor_id: form.supervisor_id || undefined,
              shift: form.shift,
              is_active: form.is_active,
            });
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={form.ward_id}
              onChange={(event) => setForm((prev) => ({ ...prev, ward_id: event.target.value }))}
              required
            >
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={form.vehicle_id}
              onChange={(event) => setForm((prev) => ({ ...prev, vehicle_id: event.target.value }))}
              required
            >
              <option value="">Select vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registration_no}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={form.driver_id}
              onChange={(event) => setForm((prev) => ({ ...prev, driver_id: event.target.value }))}
              required
            >
              <option value="">Select driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>

            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={form.supervisor_id}
              onChange={(event) => setForm((prev) => ({ ...prev, supervisor_id: event.target.value }))}
            >
              <option value="">Select supervisor (optional)</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-11 rounded-lg border border-transparent bg-gray-100 px-3 text-sm"
              value={form.shift}
              onChange={(event) => setForm((prev) => ({ ...prev, shift: event.target.value as Shift }))}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>

            <label className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
              />
              Active route
            </label>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">Stops (drag to reorder)</p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {orderedStops.map((stop) => (
                <div
                  key={stop.id}
                  draggable
                  onDragStart={() => setDraggingStopId(stop.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggingStopId || draggingStopId === stop.id) return;
                    const from = orderedStops.findIndex((item) => item.id === draggingStopId);
                    const to = orderedStops.findIndex((item) => item.id === stop.id);
                    if (from < 0 || to < 0) return;
                    const next = [...orderedStops];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    setStops(next);
                  }}
                  className="cursor-move rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
                >
                  <span className="mr-2 text-xs text-gray-500">#{stop.sequence_order}</span>
                  {stop.address}
                </div>
              ))}
              {orderedStops.length === 0 ? (
                <p className="text-sm text-gray-500">No stops attached to this route yet.</p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" className="bg-gray-200 text-gray-800" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2E7D32] text-white" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
