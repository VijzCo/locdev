import { NavLink } from 'react-router-dom';
import { NAVIGATION } from '@/lib/navigation';
import { useAuth } from '@/auth/AuthProvider';
import { usePlatform } from '@/platform/PlatformProvider';
import { cn } from '@/lib/utils';

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  const { can, isDevAdmin } = useAuth();
  const { featureOn } = usePlatform();

  /*
   * Three filters, each doing a different job.
   *
   *   devOnly    — the developer section, never shown to a customer and not
   *                subject to the feature flags, since it is what operates
   *                them
   *   feature    — an area switched off platform-wide
   *   capability — what this particular person may do
   *
   * Hiding is a convenience in every case. The rules and the route guards
   * are what actually decide.
   */
  const groups = NAVIGATION.filter((g) => (g.devOnly ? isDevAdmin : true))
    /*
     * A dev admin keeps seeing an area that is switched off, marked as such.
     *
     * Hiding it from them too was a trap: switching Administration off
     * removed the menu entry for everyone, and the switch to turn it back on
     * lives inside the developer section — reachable only by typing the
     * address. The route guard already let a dev admin through; the sidebar
     * has to agree with it.
     */
    .filter((g) => g.devOnly || !g.feature || featureOn(g.feature) || isDevAdmin)
    .map((g) => ({
      ...g,
      off: Boolean(g.feature) && !featureOn(g.feature!),
      items: g.items.filter((i) => g.devOnly || can(i.capability)),
    }))
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
          <div
            key={group.label}
            className={cn('px-2 py-2', group.devOnly && 'mt-2 border-t border-navy-700 pt-3')}
          >
            <div className="flex items-center gap-2 px-2 pb-1.5">
              <group.icon
                size={13}
                className={group.devOnly ? 'text-accent' : 'text-white/35'}
                aria-hidden
              />
              <span
                className={cn(
                  'font-display text-eyebrow uppercase tracking-[0.12em]',
                  group.devOnly ? 'text-accent' : 'text-white/35',
                )}
              >
                {group.label}
              </span>
              {group.off && (
                <span className="font-display text-eyebrow uppercase tracking-[0.1em] text-signal-amber">
                  off
                </span>
              )}
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
