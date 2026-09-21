// src/lib/roles.js
// Role-based access control. Roles and their capabilities are configurable by a
// Super Admin (stored in the `roles` collection); the values here are the
// built-in DEFAULTS used as a fallback when the database has no override.

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  FACTORY_ADMIN: "factory_admin",
  DEPARTMENT_MANAGER: "department_manager",
  SUPERVISOR: "supervisor",
  TEAM_LEADER: "team_leader",
  OPERATOR: "operator",
  MAINTENANCE_TECH: "maintenance_technician",
  QUALITY_INSPECTOR: "quality_inspector",
  VIEWER: "viewer",
  // legacy
  FACTORY_MANAGER: "factory_manager",
};

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  factory_admin: "Factory Admin",
  department_manager: "Department Manager",
  supervisor: "Supervisor",
  team_leader: "Team Leader",
  operator: "Operator",
  maintenance_technician: "Maintenance Technician",
  quality_inspector: "Quality Inspector",
  viewer: "Viewer",
  factory_manager: "Factory Manager",
};

// Catalog of grantable functions, grouped for the Roles & Access screen.
export const CAPABILITIES = [
  { group: "Monitoring", items: [
    { key: "view_dashboard", label: "View dashboard / board" },
    { key: "view_reports", label: "View reports" },
    { key: "enter_production", label: "Enter hourly production" },
  ]},
  { group: "Planning", items: [
    { key: "manage_plans", label: "Manage daily plans" },
    { key: "manage_allocation", label: "Manage shift allocation" },
  ]},
  { group: "Master data", items: [
    { key: "manage_factories", label: "Manage factories" },
    { key: "manage_departments", label: "Manage departments" },
    { key: "manage_sections", label: "Manage sections" },
    { key: "manage_modules", label: "Manage modules" },
    { key: "manage_styles", label: "Manage styles" },
    { key: "manage_shifts", label: "Manage shifts & slots" },
  ]},
  { group: "Downtime & Andon", items: [
    { key: "raise_downtime", label: "Raise downtime / andon" },
    { key: "attend_downtime", label: "Attend / complete / verify" },
    { key: "manage_downtime_config", label: "Configure categories & reasons" },
    { key: "view_downtime_dashboard", label: "View downtime dashboard" },
  ]},
  { group: "Administration", items: [
    { key: "manage_users", label: "Manage users" },
    { key: "manage_roles", label: "Manage roles & access" },
    { key: "manage_devices", label: "Manage devices" },
    { key: "manage_settings", label: "Manage settings" },
    { key: "view_audit", label: "View audit log" },
  ]},
];

export const ALL_CAPS = CAPABILITIES.flatMap((g) => g.items.map((i) => i.key));
export const CAP_LABEL = Object.fromEntries(
  CAPABILITIES.flatMap((g) => g.items.map((i) => [i.key, i.label]))
);

const MONITOR = ["view_dashboard", "view_reports"];
const ENTRY = ["enter_production"];
const DT_USE = ["raise_downtime", "attend_downtime", "view_downtime_dashboard"];

export const DEFAULT_ROLES = {
  super_admin: { name: "Super Admin", builtin: true, capabilities: [...ALL_CAPS] },
  factory_admin: { name: "Factory Admin", builtin: true, capabilities: [
    ...ALL_CAPS.filter((c) => !["manage_users", "manage_roles", "manage_settings"].includes(c)),
  ]},
  department_manager: { name: "Department Manager", builtin: true, capabilities: [
    "manage_plans", "manage_allocation", "manage_modules", "manage_styles",
    "manage_downtime_config", ...DT_USE, ...ENTRY, ...MONITOR, "view_audit",
  ]},
  factory_manager: { name: "Factory Manager", builtin: true, capabilities: [
    "manage_plans", "manage_allocation", "manage_modules", "manage_styles",
    "manage_downtime_config", ...DT_USE, ...ENTRY, ...MONITOR, "view_audit",
  ]},
  supervisor: { name: "Supervisor", builtin: true, capabilities: [...ENTRY, ...DT_USE, ...MONITOR] },
  team_leader: { name: "Team Leader", builtin: true, capabilities: [...ENTRY, "raise_downtime", "view_downtime_dashboard", ...MONITOR] },
  operator: { name: "Operator", builtin: true, capabilities: ["raise_downtime", "view_dashboard"] },
  maintenance_technician: { name: "Maintenance Technician", builtin: true, capabilities: ["attend_downtime", "view_downtime_dashboard", "view_dashboard"] },
  quality_inspector: { name: "Quality Inspector", builtin: true, capabilities: ["raise_downtime", "attend_downtime", "view_downtime_dashboard", "view_dashboard"] },
  viewer: { name: "Viewer", builtin: true, capabilities: [...MONITOR, "view_downtime_dashboard"] },
};

export function defaultCapsFor(roleKey) {
  return DEFAULT_ROLES[roleKey]?.capabilities || [];
}

export function can(user, capability) {
  if (!user || !user.role) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  const caps = user.capabilities || defaultCapsFor(user.role);
  return caps.includes(capability);
}

/** Filter factory-scoped records to ones the user may see. */
export function scopeFactories(user, records, factoryKey = "factoryId") {
  if (!user) return [];
  if (user.role === ROLES.SUPER_ADMIN) return records;
  const allowed = new Set(user.factories || []);
  return records.filter((r) => allowed.has(r[factoryKey]));
}
