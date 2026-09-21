// src/App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Loader from "./components/Loader.jsx";

import Login from "./pages/Login.jsx";
import Launcher from "./pages/Launcher.jsx";
import DeviceHome from "./pages/DeviceHome.jsx";
import ModuleTV from "./pages/ModuleTV.jsx";
import DisplayBoard from "./pages/DisplayBoard.jsx";
import ModuleTab from "./pages/ModuleTab.jsx";
import HourlyEntry from "./pages/HourlyEntry.jsx";
import Reports from "./pages/Reports.jsx";
import Downtime from "./pages/Downtime.jsx";
import DowntimeDisplay from "./pages/DowntimeDisplay.jsx";
import DowntimeDashboard from "./pages/DowntimeDashboard.jsx";
import DowntimeConfig from "./pages/DowntimeConfig.jsx";
import Notifications from "./pages/Notifications.jsx";
import Factories from "./pages/Factories.jsx";
import Departments from "./pages/Departments.jsx";
import Sections from "./pages/Sections.jsx";
import Modules from "./pages/Modules.jsx";
import Devices from "./pages/Devices.jsx";
import Styles from "./pages/Styles.jsx";
import Shifts from "./pages/Shifts.jsx";
import TeamAllocation from "./pages/TeamAllocation.jsx";
import Plans from "./pages/Plans.jsx";
import Users from "./pages/Users.jsx";
import RolesAccess from "./pages/RolesAccess.jsx";
import AuditLog from "./pages/AuditLog.jsx";
import Settings from "./pages/Settings.jsx";



// Wrap a page in the app shell + capability guard.
const guard = (cap, Page) => (
  <ProtectedRoute capability={cap}>
    <Layout>
      <Page />
    </Layout>
  </ProtectedRoute>
);

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Loader full label="Starting up…" />;

  return (
    <>
      <KioskRedirect />
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Public, login-less views (for TV walls and floor phones) */}
        <Route path="/display" element={<DisplayBoard />} />
        <Route path="/downtime/display" element={<DowntimeDisplay />} />
        <Route path="/device" element={<DeviceHome />} />
        <Route path="/module/tv" element={<ModuleTV />} />
        <Route path="/module" element={<ModuleTab />} />

        <Route path="/" element={guard("view_dashboard", Launcher)} />
        <Route
          path="/promis"
          element={
            <ProtectedRoute capability="view_dashboard">
              <Layout>
                <DisplayBoard embedded />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/entry" element={guard("enter_production", HourlyEntry)} />
        <Route path="/reports" element={guard("view_reports", Reports)} />

        <Route path="/downtime" element={guard("view_downtime_dashboard", Downtime)} />
        <Route path="/downtime/dashboard" element={guard("view_downtime_dashboard", DowntimeDashboard)} />
        <Route path="/downtime/config" element={guard("manage_downtime_config", DowntimeConfig)} />
        <Route path="/notifications" element={guard("view_dashboard", Notifications)} />

        <Route path="/factories" element={guard("manage_factories", Factories)} />
        <Route path="/departments" element={guard("manage_departments", Departments)} />
        <Route path="/sections" element={guard("manage_sections", Sections)} />
        <Route path="/modules" element={guard("manage_modules", Modules)} />
        <Route path="/devices" element={guard("manage_devices", Devices)} />
        <Route path="/styles" element={guard("manage_styles", Styles)} />
        <Route path="/shifts" element={guard("manage_shifts", Shifts)} />
        <Route path="/allocation" element={guard("manage_allocation", TeamAllocation)} />
        <Route path="/plans" element={guard("manage_plans", Plans)} />
        <Route path="/users" element={guard("manage_users", Users)} />
        <Route path="/roles" element={guard("manage_roles", RolesAccess)} />
        <Route path="/audit" element={guard("view_audit", AuditLog)} />
        <Route path="/settings" element={guard("manage_settings", Settings)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

// On the Android APK (native), open straight to the module tab — a floor-tablet
// kiosk. On the web this does nothing, so the full app is unaffected.
function KioskRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (Capacitor?.isNativePlatform?.() && loc.pathname === "/") nav("/device", { replace: true });
  }, []); // eslint-disable-line
  return null;
}
