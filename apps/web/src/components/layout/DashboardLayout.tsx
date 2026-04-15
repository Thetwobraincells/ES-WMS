import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.name) {
      setShowWelcome(true);
      const timer = setTimeout(() => setShowWelcome(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [user?.name]);

  return (
    <div className="relative flex min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} />

      {/* Main content area */}
      <div
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          collapsed ? "ml-[72px]" : "ml-[260px]",
        )}
      >
        {children}
      </div>

      {/* Welcome Popup */}
      <div
        className={cn(
          "fixed right-6 top-6 z-[9999] rounded-xl border border-brand-500/20 bg-white px-6 py-4 shadow-xl transition-all duration-500 ease-in-out",
          showWelcome ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex bg-[#E8F5E9] text-[#2E7D32] h-10 w-10 items-center justify-center rounded-full text-lg font-bold">
            👋
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Welcome back!</p>
            <p className="text-sm text-gray-600">{user?.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
