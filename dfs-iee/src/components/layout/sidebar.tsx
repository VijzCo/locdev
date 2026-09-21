'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types';
import {
  LayoutDashboard,
  Cpu,
  ClipboardList,
  Layers,
  Activity,
  BarChart3,
  MessagesSquare,
  Settings,
  Users,
  Building2,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/styles', label: 'Styles', icon: Layers, permission: 'styles.read' },
  { href: '/smv', label: 'SMV Calculator', icon: Cpu, permission: 'smv.read' },
  {
    href: '/operation-bulletin',
    label: 'Operation Bulletin',
    icon: ClipboardList,
    permission: 'ob.read',
  },
  {
    href: '/line-balancing',
    label: 'Line Balancing',
    icon: Activity,
    permission: 'lines.read',
  },
  { href: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.read' },
  { href: '/chat', label: 'Chat', icon: MessagesSquare, permission: 'chat.access' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: Users, permission: 'users.manage' },
  {
    href: '/admin/tenants',
    label: 'Tenant',
    icon: Building2,
    permission: 'tenant.manage',
  },
  {
    href: '/admin/subscriptions',
    label: 'Billing',
    icon: BarChart3,
    permission: 'tenant.billing',
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    permission: 'settings.read',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const filterNav = (items: NavItem[]) =>
    items.filter((i) => !i.permission || hasPermission(i.permission));

  const primary = filterNav(PRIMARY_NAV);
  const admin = filterNav(ADMIN_NAV);

  return (
    <aside className="hidden w-64 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
          <span className="font-display text-sm font-bold">IE</span>
        </div>
        <span className="font-display text-lg font-bold tracking-tight">SMV</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {primary.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}

        {admin.length > 0 && (
          <>
            <div className="px-3 pb-1 pt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </div>
            {admin.map((item) => (
              <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
