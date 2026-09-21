import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Placeholder } from '@/pages/Placeholder';
import {
  DepartmentDashboard,
  FactoryDashboard,
  ModuleDashboard,
} from '@/pages/dashboards/Dashboards';
import { HourlyOutput, WipDashboard } from '@/pages/dashboards/WipAndHourly';
import { WallDisplay } from '@/pages/dashboards/WallDisplay';
import { Reports } from '@/pages/reports/Reports';
import { AuditLog } from '@/pages/admin/AuditLog';
import { Login } from '@/pages/Login';
import { UsersAdmin } from '@/pages/admin/Users';
import { LicencePage } from '@/pages/admin/Licence';
import { VendorConsole } from '@/pages/vendor/VendorConsole';
import { FactorySettings, GlobalSettings } from '@/pages/admin/SettingsRoutes';
import { RolesCapabilities } from '@/pages/admin/RolesCapabilities';
import { WipConfiguration } from '@/pages/wip/WipConfiguration';
import { Departments, Factories, Modules, Sections } from '@/pages/master/Hierarchy';
import { HierarchyOverview } from '@/pages/master/HierarchyOverview';
import { Styles } from '@/pages/master/Styles';
import { PurchaseOrders } from '@/pages/planning/PurchaseOrders';
import { Bundles } from '@/pages/planning/Bundles';
import { ScanScreen } from '@/pages/production/ScanScreen';
import { BundleTracking } from '@/pages/production/BundleTracking';
import { Shifts } from '@/pages/planning/Shifts';
import { DailyPlans } from '@/pages/planning/DailyPlans';
import { RequireAuth, RequireCapability, RequireDevAdmin } from '@/auth/guards';
import { RequireFeature } from '@/platform/RequireFeature';
import { VendorSettings } from '@/pages/vendor/VendorSettings';
import type { Capability } from '@/lib/capabilities';
import type { FeatureKey } from '@/platform/settings';

const stub = (title: string, increment: string, description?: string) => (
  <Placeholder title={title} increment={increment} description={description} />
);

/**
 * Screen gate: the platform feature first, then the person's capability.
 * The rules enforce the capability again server-side; the feature flag is
 * the vendor's switch and only exists in the client.
 */
const gate = (capability: Capability, element: React.ReactNode, feature?: FeatureKey) => {
  const guarded = <RequireCapability capability={capability}>{element}</RequireCapability>;
  return feature ? <RequireFeature feature={feature}>{guarded}</RequireFeature> : guarded;
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard/factory" replace />} />

        <Route path="dashboard">
          <Route path="factory" element={gate('dashboard.view', <FactoryDashboard />, 'dashboards')} />
          <Route path="department" element={gate('dashboard.view', <DepartmentDashboard />, 'dashboards')} />
          <Route path="module" element={gate('dashboard.view', <ModuleDashboard />, 'dashboards')} />
        </Route>

        <Route path="production">
          <Route path="in" element={gate('scan.in', <ScanScreen direction="IN" />, 'scanning')} />
          <Route path="out" element={gate('scan.out', <ScanScreen direction="OUT" />, 'scanning')} />
          <Route path="hourly" element={gate('dashboard.view', <HourlyOutput />, 'dashboards')} />
          <Route path="bundles" element={gate('dashboard.view', <BundleTracking />, 'scanning')} />
        </Route>

        <Route path="planning">
          <Route path="purchase-orders" element={gate('plan.manage', <PurchaseOrders />, 'planning')} />
          <Route path="bundles" element={gate('plan.manage', <Bundles />, 'planning')} />
          <Route path="daily-plans" element={gate('plan.manage', <DailyPlans />, 'planning')} />
          <Route path="shifts" element={gate('plan.manage', <Shifts />, 'planning')} />
        </Route>

        <Route path="wip">
          <Route index element={gate('dashboard.view', <WipDashboard />, 'wip')} />
          <Route path="configuration" element={gate('wip.configure', <WipConfiguration />, 'wip')} />
        </Route>

        <Route path="master">
          <Route index element={gate('master.manage', <HierarchyOverview />, 'masterData')} />
          <Route path="hierarchy" element={gate('master.manage', <HierarchyOverview />, 'masterData')} />
          <Route path="factories" element={gate('master.manage', <Factories />, 'masterData')} />
          <Route path="departments" element={gate('master.manage', <Departments />, 'masterData')} />
          <Route path="sections" element={gate('master.manage', <Sections />, 'masterData')} />
          <Route path="modules" element={gate('master.manage', <Modules />, 'masterData')} />
          <Route path="styles" element={gate('master.manage', <Styles />, 'masterData')} />
        </Route>

        <Route path="reports">
          <Route path="production" element={gate('reports.view', <Reports kind="production" />, 'reports')} />
          <Route path="efficiency" element={gate('reports.view', <Reports kind="efficiency" />, 'reports')} />
          <Route path="wip" element={gate('reports.view', <Reports kind="wip" />, 'reports')} />
          <Route
            path="bundle-history"
            element={gate('reports.view', <Reports kind="bundles" />, 'reports')}
          />
          <Route
            path="po-completion"
            element={gate('reports.view', <Reports kind="completion" />, 'reports')}
          />
        </Route>

        <Route path="admin">
          <Route path="users" element={gate('users.manage', <UsersAdmin />, 'administration')} />
          <Route path="roles" element={gate('users.manage', <RolesCapabilities />, 'administration')} />
          <Route
            path="factory-settings"
            element={gate('settings.manage', <FactorySettings />, 'administration')}
          />
          {/* Vendor only. A customer keeps their factory settings; the
              organisation-wide baseline stays with the supplier. */}
          <Route
            path="global-settings"
            element={
              <RequireDevAdmin>
                <GlobalSettings />
              </RequireDevAdmin>
            }
          />
          <Route path="licence" element={gate('settings.manage', <LicencePage />, 'administration')} />
          <Route path="audit" element={gate('settings.manage', <AuditLog />, 'administration')} />
        </Route>

        <Route
          path="vendor"
          element={
            <RequireDevAdmin>
              <VendorConsole />
            </RequireDevAdmin>
          }
        />
        <Route
          path="vendor/settings"
          element={
            <RequireDevAdmin>
              <VendorSettings />
            </RequireDevAdmin>
          }
        />
      </Route>

      <Route
        path="/wall"
        element={
          <RequireAuth>
            <RequireFeature feature="wallDisplay">
              <WallDisplay />
            </RequireFeature>
          </RequireAuth>
        }
      />

      <Route
        path="*"
        element={stub('Page not found', 'nothing — check the address', 'That route does not exist.')}
      />
    </Routes>
  );
}
