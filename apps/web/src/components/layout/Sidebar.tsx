import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Route,
  ClipboardList,
  Receipt,
  Bell,
  Building2,
  BarChart3,
  Scale,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/routes", label: "Routes", icon: Route },
  { to: "/backlog", label: "Backlog", icon: ClipboardList },
  { to: "/fines", label: "Fines", icon: Receipt },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/societies", label: "Societies", icon: Building2 },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/reports/mass-balance", label: "Mass Balance", icon: Scale },
  { to: "/users", label: "Users", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-[600] flex flex-col bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* ── Brand ───────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 font-bold text-white shadow-glow">
          <Shield className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="text-sm font-bold tracking-wide text-white">ES-WMS</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">
              ICCC Dashboard
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-brand-500/15 text-brand-300 shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-white",
                    collapsed && "justify-center px-0",
                  )
                }
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                  )}
                />
                {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] p-3">
        {/* User info */}
        <div
          className={cn(
            "mb-2 flex items-center gap-3 rounded-xl px-3 py-2",
            collapsed && "justify-center px-0",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-300">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          {!collapsed && (
            <div className="animate-fade-in overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{user?.name ?? "User"}</p>
              <p className="text-[10px] text-sidebar-muted">{user?.role ?? "ADMIN"}</p>
            </div>
          )}
        </div>

        {/* Collapse + Logout */}
        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-red-500/15 hover:text-red-400"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
