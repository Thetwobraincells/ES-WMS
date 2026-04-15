import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { RoutesPage } from "@/pages/routes/RoutesPage";
import { BacklogPage } from "@/pages/backlog/BacklogPage";
import { FinesPage } from "@/pages/fines/FinesPage";
import { AlertsPage } from "@/pages/alerts/AlertsPage";
import { MassBalancePage } from "@/pages/reports/MassBalancePage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { SocietiesPage } from "@/pages/societies/SocietiesPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/backlog" element={<BacklogPage />} />
            <Route path="/fines" element={<FinesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/societies" element={<SocietiesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/mass-balance" element={<MassBalancePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
