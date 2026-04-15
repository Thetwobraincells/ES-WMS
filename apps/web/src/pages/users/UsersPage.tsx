import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserTable } from "@/components/users/UserTable";
import { UserFormModal } from "@/components/users/UserFormModal";
import {
  createUser,
  getUsers,
  updateUser,
  type UserRecord,
  type UserRole,
} from "@/services/user.service";

const roleOptions: Array<{ label: string; value: "ALL" | UserRole }> = [
  { label: "All Roles", value: "ALL" },
  { label: "Driver", value: "DRIVER" },
  { label: "Supervisor", value: "SUPERVISOR" },
  { label: "Admin", value: "ADMIN" },
  { label: "Citizen", value: "CITIZEN" },
];

export function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers(roleFilter === "ALL" ? undefined : roleFilter);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreateOrUpdate(payload: {
    name: string;
    role: UserRole;
    mobile?: string;
    email?: string;
    password?: string;
    is_active: boolean;
  }) {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === "create") {
        await createUser(payload);
      } else if (selectedUser) {
        // Role updates are intentionally excluded for edit mode.
        await updateUser(selectedUser.id, {
          name: payload.name,
          mobile: payload.mobile,
          email: payload.email,
          password: payload.password,
          is_active: payload.is_active,
        });
      }
      setModalOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user: UserRecord) {
    setSaving(true);
    setError(null);
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F7F6] p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">Create, update, and deactivate command center users.</p>
          </div>
          <Button
            className="bg-[#2E7D32] text-white"
            onClick={() => {
              setModalMode("create");
              setSelectedUser(null);
              setModalOpen(true);
            }}
          >
            Create User
          </Button>
        </header>

        <Card className="rounded-2xl p-4 shadow-md">
          <div className="flex flex-wrap items-center gap-2">
            {roleOptions.map((option) => (
              <Button
                key={option.value}
                className={roleFilter === option.value ? "bg-[#2E7D32] text-white" : "bg-gray-200 text-gray-800"}
                onClick={() => setRoleFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </Card>

        {error ? (
          <Card className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 shadow-md">
            {error}
          </Card>
        ) : null}

        {loading ? (
          <Card className="rounded-2xl p-6 text-sm text-gray-600 shadow-md">Loading users...</Card>
        ) : (
          <UserTable
            users={users}
            onEdit={(user) => {
              setModalMode("edit");
              setSelectedUser(user);
              setModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </div>

      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        user={selectedUser}
        loading={saving}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleCreateOrUpdate}
      />
    </main>
  );
}
