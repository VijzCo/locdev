import { useNavigate } from 'react-router-dom';
import { Eye, PenLine, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { cn } from '@/lib/utils';

/**
 * Shown across the top whenever a vendor admin is looking at a customer's
 * system.
 *
 * It is deliberately loud and cannot be dismissed. Editing a customer's
 * shift times while believing you are in your own account is the kind of
 * mistake that only has to happen once, and a subtle indicator is not enough
 * to prevent it.
 */
export function SupportBanner() {
  const { viewingTenant, setViewingTenant } = useAuth();
  const navigate = useNavigate();

  if (!viewingTenant) return null;

  const writing = viewingTenant.allowWrites;

  return (
    <div
      className={cn(
        'no-print flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-6',
        writing
          ? 'border-signal-red/50 bg-signal-red/15 text-signal-red'
          : 'border-signal-amber/50 bg-signal-amber/15 text-signal-amber',
      )}
      role="status"
    >
      {writing ? <PenLine size={16} /> : <Eye size={16} />}

      <p className="text-sm">
        <span className="font-display uppercase tracking-[0.06em]">
          {writing ? 'Editing' : 'Viewing'} {viewingTenant.name}
        </span>
        <span className="ml-2 text-ink/70">
          {writing
            ? 'Changes you make are saved to their live system.'
            : 'Read only. Their data cannot be changed from here.'}
        </span>
      </p>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() =>
            setViewingTenant({ ...viewingTenant, allowWrites: !writing })
          }
          className="rounded border border-current px-2.5 py-1 font-display text-eyebrow uppercase tracking-[0.1em]"
        >
          {writing ? 'Switch to read only' : 'Allow changes'}
        </button>

        <button
          onClick={() => {
            setViewingTenant(null);
            navigate('/vendor');
          }}
          className="inline-flex items-center gap-1.5 rounded border border-current px-2.5 py-1 font-display text-eyebrow uppercase tracking-[0.1em]"
        >
          <X size={13} />
          Leave
        </button>
      </div>
    </div>
  );
}
