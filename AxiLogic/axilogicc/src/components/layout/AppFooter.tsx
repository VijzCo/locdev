import { usePlatform } from '@/platform/PlatformProvider';

/**
 * Footer credit, set from the vendor portal.
 *
 * Quiet by design: it belongs to the supplier, not the customer, and a wall
 * display seen from across a factory should not be advertising anybody.
 * It can be switched off entirely for a customer who wants an unbranded
 * screen on their floor.
 */
export function AppFooter() {
  const { settings } = usePlatform();
  if (!settings.branding.showFooter) return null;

  return (
    <footer className="no-print flex shrink-0 items-center justify-between border-t border-line bg-surface px-4 py-1.5 sm:px-6">
      <span className="font-display text-eyebrow uppercase tracking-[0.12em] text-faint">
        {settings.branding.footerText}
      </span>
      {settings.branding.supportEmail && (
        <a
          href={`mailto:${settings.branding.supportEmail}`}
          className="text-xs text-faint hover:text-muted"
        >
          {settings.branding.supportEmail}
        </a>
      )}
    </footer>
  );
}
