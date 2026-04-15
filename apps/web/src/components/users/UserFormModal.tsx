import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UserRecord, UserRole } from "@/services/user.service";

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  user: UserRecord | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    role: UserRole;
    mobile?: string;
    email?: string;
    password?: string;
    is_active: boolean;
  }) => Promise<void>;
};

const defaultForm = {
  name: "",
  role: "DRIVER" as UserRole,
  mobile: "",
  email: "",
  password: "",
  is_active: true,
};

export function UserFormModal({ open, mode, user, loading, onClose, onSubmit }: UserFormModalProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && user) {
      setForm({
        name: user.name,
        role: user.role,
        mobile: user.mobile ?? "",
        email: user.email ?? "",
        password: "",
        is_active: user.is_active,
      });
      return;
    }
    setForm(defaultForm);
  }, [mode, open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg rounded-2xl p-6 shadow-md">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{mode === "create" ? "Create User" : "Edit User"}</h3>
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await onSubmit({
              name: form.name.trim(),
              role: form.role,
              mobile: form.mobile.trim() || undefined,
              email: form.email.trim() || undefined,
              password: form.password.trim() || undefined,
              is_active: form.is_active,
            });
          }}
        >
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Role</label>
            <select
              className="h-11 w-full rounded-lg border border-transparent bg-gray-100 px-3 text-sm text-gray-900 outline-none"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              disabled={mode === "edit"}
            >
              <option value="DRIVER">DRIVER</option>
              <option value="SUPERVISOR">SUPERVISOR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="CITIZEN">CITIZEN</option>
            </select>
            {mode === "edit" ? (
              <p className="mt-1 text-xs text-gray-500">Role is locked for edit mode.</p>
            ) : null}
          </div>

          <Input
            placeholder="Mobile"
            value={form.mobile}
            onChange={(event) => setForm((prev) => ({ ...prev, mobile: event.target.value }))}
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            type="password"
            placeholder={mode === "create" ? "Password (optional)" : "New Password (optional)"}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Active
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" className="bg-gray-200 text-gray-800" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#2E7D32] text-white" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
