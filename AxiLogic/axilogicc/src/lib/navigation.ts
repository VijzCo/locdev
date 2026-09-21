import {
  Wrench,
  LayoutDashboard,
  ScanLine,
  ClipboardList,
  Layers,
  Database,
  BarChart3,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import type { Capability } from './capabilities';
import type { FeatureKey } from '@/platform/settings';

export interface NavItem {
  label: string;
  to: string;
  capability: Capability;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  /** Switched off platform-wide from the developer portal. */
  feature?: FeatureKey;
  items: NavItem[];
  /**
   * Only shown to a developer administrator. Not a feature flag — a flag
   * can be switched off, and this must never be switched on for a customer.
   */
  devOnly?: boolean;
}

/** Mirrors §37. Each entry names the capability that reveals it. */
export const NAVIGATION: NavGroup[] = [
  {
    label: 'Dashboard',
    feature: 'dashboards',
    icon: LayoutDashboard,
    items: [
      { label: 'Factory', to: '/dashboard/factory', capability: 'dashboard.view' },
      { label: 'Department', to: '/dashboard/department', capability: 'dashboard.view' },
      { label: 'Module', to: '/dashboard/module', capability: 'dashboard.view' },
      { label: 'Wall display', to: '/wall', capability: 'dashboard.view' },
    ],
  },
  {
    label: 'Production',
    feature: 'scanning',
    icon: ScanLine,
    items: [
      { label: 'Scan in', to: '/production/in', capability: 'scan.in' },
      { label: 'Scan out', to: '/production/out', capability: 'scan.out' },
      { label: 'Hourly output', to: '/production/hourly', capability: 'dashboard.view' },
      { label: 'Bundle tracking', to: '/production/bundles', capability: 'dashboard.view' },
    ],
  },
  {
    label: 'Planning',
    feature: 'planning',
    icon: ClipboardList,
    items: [
      { label: 'Purchase orders', to: '/planning/purchase-orders', capability: 'plan.manage' },
      { label: 'Bundles & labels', to: '/planning/bundles', capability: 'plan.manage' },
      { label: 'Daily plans', to: '/planning/daily-plans', capability: 'plan.manage' },
      { label: 'Shifts & slots', to: '/planning/shifts', capability: 'plan.manage' },
    ],
  },
  {
    label: 'WIP',
    feature: 'wip',
    icon: Layers,
    items: [
      { label: 'WIP dashboard', to: '/wip', capability: 'dashboard.view' },
      { label: 'WIP configuration', to: '/wip/configuration', capability: 'wip.configure' },
    ],
  },
  {
    label: 'Master data',
    feature: 'masterData',
    icon: Database,
    items: [
      { label: 'Hierarchy', to: '/master/hierarchy', capability: 'master.manage' },
      { label: 'Factories', to: '/master/factories', capability: 'master.manage' },
      { label: 'Departments', to: '/master/departments', capability: 'master.manage' },
      { label: 'Sections', to: '/master/sections', capability: 'master.manage' },
      { label: 'Modules', to: '/master/modules', capability: 'master.manage' },
      { label: 'Styles', to: '/master/styles', capability: 'master.manage' },
    ],
  },
  {
    label: 'Reports',
    feature: 'reports',
    icon: BarChart3,
    items: [
      { label: 'Production', to: '/reports/production', capability: 'reports.view' },
      { label: 'Efficiency', to: '/reports/efficiency', capability: 'reports.view' },
      { label: 'WIP', to: '/reports/wip', capability: 'reports.view' },
      { label: 'Bundle history', to: '/reports/bundle-history', capability: 'reports.view' },
      { label: 'PO completion', to: '/reports/po-completion', capability: 'reports.view' },
    ],
  },
  {
    label: 'Administration',
    feature: 'administration',
    icon: Settings2,
    items: [
      { label: 'Users', to: '/admin/users', capability: 'users.manage' },
      { label: 'Roles & capabilities', to: '/admin/roles', capability: 'users.manage' },
      { label: 'Factory settings', to: '/admin/factory-settings', capability: 'settings.manage' },
      { label: 'Licence', to: '/admin/licence', capability: 'settings.manage' },
      { label: 'Audit log', to: '/admin/audit', capability: 'settings.manage' },
    ],
  },

  /*
   * Developer administration. Invisible to every customer account, and not
   * governed by the feature flags — those are the switches this section
   * operates, so gating it with them would let it turn itself off.
   */
  {
    label: 'Dev admin',
    icon: Wrench,
    devOnly: true,
    items: [
      { label: 'Customers', to: '/vendor', capability: 'dashboard.view' },
      { label: 'Platform settings', to: '/vendor/settings', capability: 'dashboard.view' },
      { label: 'Product defaults', to: '/admin/global-settings', capability: 'dashboard.view' },
    ],
  },
];
