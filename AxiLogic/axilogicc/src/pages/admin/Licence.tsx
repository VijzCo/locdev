import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/pages/Placeholder';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/Metric';
import { Diagnostics } from './Diagnostics';
import type { SignalStatus } from '@/types/domain';

const TONE: Record<string, SignalStatus> = {
  ACTIVE: 'GREEN',
  TRIAL: 'AMBER',
  GRACE: 'RED',
  EXPIRED: 'RED',
  SUSPENDED: 'RED',
};

/**
 * Deliberately read-only. No role inside a customer's tenant can edit the
 * licence, and no UI path exposes it — the fields below are rendered from a
 * document the rules make unwritable to everyone but the vendor.
 */
export function LicencePage() {
  const { licence } = useAuth();

  return (
    <>
      <PageHeader
        title="Licence"
        description="Your current plan and what it allows. Contact your supplier to change it."
      />

      <div className="max-w-2xl space-y-4 p-4 sm:p-6">
        <Diagnostics />

        <Card signal={TONE[licence.status] ?? 'GREY'}>
          <CardBody className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Status</p>
                <p className="font-display text-2xl uppercase tracking-[0.04em] leading-none">
                  {licence.status}
                </p>
              </div>
              <StatusChip
                status={TONE[licence.status] ?? 'GREY'}
                label={
                  licence.daysRemaining !== null
                    ? `${licence.daysRemaining} days remaining`
                    : 'No expiry set'
                }
              />
            </div>

            {licence.banner && <p className="text-sm text-muted">{licence.banner.text}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-4">
            <p className="eyebrow mb-3">What happens when it expires</p>
            <dl className="space-y-2 text-sm">
              <Row term="Dashboards, history and reports" desc="Keep working" />
              <Row term="Exporting your data" desc="Keeps working" />
              <Row term="Scanning production" desc="Pauses" />
              <Row term="Configuration changes" desc="Pause" />
            </dl>
            <p className="mt-4 max-w-prose text-sm text-muted">
              Your production history stays available to you whatever the licence state. Renewing
              restores scanning immediately, with no sign-out needed.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0">
      <dt className="text-muted">{term}</dt>
      <dd className="font-display uppercase tracking-[0.04em]">{desc}</dd>
    </div>
  );
}
