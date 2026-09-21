import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '@/lib/navigation';
import { useAuth } from '@/auth/AuthProvider';
import { usePlatform } from '@/platform/PlatformProvider';
import { cn } from '@/lib/utils';

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { can } = useAuth();
  const { featureOn } = usePlatform();

  // Two filters, doing different jobs. Capability hides what this person may
  // not do; the feature flag hides what no customer may do yet. Hiding is a
  // convenience either way — the rules and the route guard decide.
  const groups = NAVIGATION.filter((g) => featureOn(g.feature))
    .map((g) => ({ ...g, items: g.items.filter((i) => can(i.capability)) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav
      className={cn(
        'no-print flex h-full w-sidebar shrink-0 flex-col overflow-y-auto scrollbar-slim',
        'bg-navy-900 text-white/70 border-r border-navy-700',
        !open && 'hidden lg:flex',
      )}
      aria-label="Main"
    >
      <div className="px-4 py-4 border-b border-navy-700">
        <p className="font-display text-xl uppercase tracking-[0.06em] text-white leading-none">
          Loomline
        </p>
        <p className="eyebrow mt-1 text-white/40">Production tracking</p>
      </div>

      <div className="flex-1 py-2">
        {groups.map((group) => (
          <div key={group.label} className="px-2 py-2">
            <div className="flex items-center gap-2 px-2 pb-1.5">
              <group.icon size={13} className="text-white/35" aria-hidden />
              <span className="font-display text-eyebrow uppercase tracking-[0.12em] text-white/35">
                {group.label}
              </span>
            </div>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'block rounded px-2 py-2 pl-6 text-[0.9375rem] leading-tight transition-colors',
                        'border-l-2 border-transparent',
                        isActive
                          ? 'bg-navy-700 text-white border-l-accent'
                          : 'hover:bg-navy-800 hover:text-white',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
