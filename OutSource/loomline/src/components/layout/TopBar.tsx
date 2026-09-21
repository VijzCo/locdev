import { LogOut, Menu, Moon, Shield, Sun, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useFactoryClock } from '@/hooks/useFactoryClock';
import { useConnection } from '@/hooks/useConnection';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/auth/AuthProvider';
import { useConfig } from '@/config/ConfigProvider';
import { licenceChipLabel } from '@/lib/licence';
import { AlertBell } from './AlertBell';
import { cn } from '@/lib/utils';

const CHIP: Record<string, string> = {
  TRIAL: 'border-signal-amber/40 bg-signal-amber/10 text-signal-amber',
  GRACE: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
  EXPIRED: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
  SUSPENDED: 'border-signal-red/40 bg-signal-red/10 text-signal-red',
  ACTIVE: 'border-line bg-raised text-muted',
};

/**
 * Factory time is the spine of this application — shifts, slots, targets and
 * forecasts all hang off it — so the live clock sits permanently here rather
 * than being buried on a settings page.
 */
export function TopBar({ onToggleNav }: { onToggleNav: () => void }) {
  const { cfg } = useConfig();
  // Timezone and tick rate are configuration, not constants — a second
  // factory in another country changes both without touching code.
  const clock = useFactoryClock(cfg('time.timezone'), cfg('time.clockTickSeconds') * 1000);
  const connection = useConnection();
  const { theme, toggle } = useTheme();
  const { profile, licence, isVendorAdmin, signOut } = useAuth();
  const offline = connection === 'OFFLINE';

  return (
    <header className="no-print flex h-topbar shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onToggleNav}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </Button>

      <div className="min-w-0">
        <p className="eyebrow leading-none">{cfg('system.companyName')}</p>
        <p className="truncate font-display text-base uppercase tracking-[0.04em] leading-tight">
          Sewing · Section A
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        {isVendorAdmin && (
          <Link
            to="/vendor"
            className="hidden items-center gap-1.5 rounded border border-accent/40 px-2.5 py-1 font-display text-eyebrow uppercase tracking-[0.1em] text-accent md:inline-flex"
          >
            <Shield size={12} />
            Vendor
          </Link>
        )}

        {licence.status !== 'ACTIVE' && (
          <span
            className={cn(
              'hidden items-center rounded border px-2.5 py-1 font-display text-eyebrow uppercase tracking-[0.1em] md:inline-flex',
              CHIP[licence.status] ?? CHIP.ACTIVE,
            )}
          >
            {licenceChipLabel(licence)}
          </span>
        )}

        <span
          className={cn(
            'inline-flex items-center gap-1.5 font-display text-eyebrow uppercase tracking-[0.1em]',
            offline ? 'text-signal-amber' : 'text-signal-green',
          )}
          title={offline ? 'Working offline. Scans queue and sync on reconnect.' : 'Connected'}
        >
          {offline ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span className="hidden sm:inline">{offline ? 'Offline' : 'Online'}</span>
        </span>

        <div className="text-right">
          <p className="eyebrow leading-none">{clock.date}</p>
          <p className="font-mono tnum text-lg leading-tight">{clock.time}</p>
        </div>

        {profile && (
          <div className="hidden text-right lg:block">
            <p className="eyebrow leading-none">{profile.role.replace('_', ' ')}</p>
            <p className="truncate text-sm leading-tight">{profile.displayName}</p>
          </div>
        )}

        <AlertBell />

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Switch theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>

        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
}
