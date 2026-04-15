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
import { Plus } from "lucide-react";

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
    <main className="min-h-screen bg-surface p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">Create, update, and manage command center accounts</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setModalMode("create");
              setSelectedUser(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </header>

        {/* Role filter pills */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRoleFilter(option.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  roleFilter === option.value
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-surface text-gray-600 hover:bg-surface-hover"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        {error ? (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Card>
        ) : null}

        {loading ? (
          <Card className="p-8 text-center text-sm text-gray-500">Loading users...</Card>
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
