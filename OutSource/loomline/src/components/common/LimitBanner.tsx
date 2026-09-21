import { useAuth } from '@/auth/AuthProvider';
import { isAtLimit, limitFor, type LimitedCollection } from '@/lib/tenantUsage';
import { cn } from '@/lib/utils';

const NOUN: Record<LimitedCollection, { one: string; many: string }> = {
  factories: { one: 'factory', many: 'factories' },
  modules: { one: 'module', many: 'modules' },
  users: { one: 'user account', many: 'user accounts' },
};

const noun = (collection: LimitedCollection, count: number) =>
  count === 1 ? NOUN[collection].one : NOUN[collection].many;

/**
 * Shows what a tenant has used against what they are licensed for.
 *
 * A blocked action has to explain itself. "Permission denied" for a factory
 * the customer is not licensed to create is technically accurate and
 * commercially useless — it reads as a fault rather than an invitation to
 * buy more.
 */
export function LimitBanner({ collection }: { collection: LimitedCollection }) {
  const { licenceDoc, usage, isVendorAdmin } = useAuth();

  // The vendor is never limited.
  if (isVendorAdmin) return null;

  const limit = limitFor(licenceDoc, collection);
  if (limit === null) return null;

  const used = usage?.[collection] ?? 0;
  const blocked = isAtLimit(usage, licenceDoc, collection);
  const close = !blocked && used >= limit - 1;

  if (!blocked && !close) {
    return (
      <p className="text-sm text-muted">
        {used} of {limit} {noun(collection, limit)} used.
      </p>
    );
  }

  return (
    <p
      className={cn(
        'andon rounded border bg-surface p-3 text-sm',
        blocked
          ? 'border-signal-red/40 text-signal-red'
          : 'border-signal-amber/40 text-signal-amber',
      )}
    >
      {blocked
        ? `Your licence covers ${limit} ${noun(collection, limit)}, and ${used === limit ? 'all are' : `${used} are`} in use. ` +
          `Remove one you no longer need, or contact your supplier to add more.`
        : `${used} of ${limit} ${noun(collection, limit)} used — one left on your licence.`}
    </p>
  );
}

/** Whether a create button should be disabled on this screen. */
export function useAtLimit(collection: LimitedCollection): boolean {
  const { licenceDoc, usage, isVendorAdmin } = useAuth();
  if (isVendorAdmin) return false;
  return isAtLimit(usage, licenceDoc, collection);
}
