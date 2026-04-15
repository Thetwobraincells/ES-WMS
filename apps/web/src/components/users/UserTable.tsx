import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UserRecord } from "@/services/user.service";

type UserTableProps = {
  users: UserRecord[];
  onEdit: (user: UserRecord) => void;
  onToggleStatus: (user: UserRecord) => void;
};

function roleClass(role: UserRecord["role"]) {
  if (role === "DRIVER") return "bg-blue-100 text-blue-700";
  if (role === "SUPERVISOR") return "bg-orange-100 text-orange-700";
  if (role === "ADMIN") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

export function UserTable({ users, onEdit, onToggleStatus }: UserTableProps) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{user.mobile ?? "—"}</td>
                <td className="px-4 py-3 text-gray-700">{user.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button className="bg-gray-900 text-white" onClick={() => onEdit(user)}>
                      Edit
                    </Button>
                    <Button
                      className={user.is_active ? "bg-red-500 text-white" : "bg-[#2E7D32] text-white"}
                      onClick={() => onToggleStatus(user)}
                    >
                      {user.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No users found for the selected filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
