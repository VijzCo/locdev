import { Card, CardBody } from '@/components/ui/Card';
import { Metric, StatusChip } from '@/components/ui/Metric';
import { PageHeader } from './Placeholder';
import type { SignalStatus } from '@/types/domain';

/**
 * Layout and visual language only. Every figure here is placeholder demo
 * data — the live wiring arrives with the WIP engine in Increment 11.
 */
const MODULES: {
  code: string;
  style: string;
  target: number;
  actual: number;
  efficiency: number;
  wip: number;
  status: SignalStatus;
  note: string;
}[] = [
  { code: 'M01', style: 'ST-1001', target: 1000, actual: 840, efficiency: 76, wip: 180, status: 'GREEN', note: 'Normal' },
  { code: 'M02', style: 'ST-1001', target: 900, actual: 612, efficiency: 63, wip: 268, status: 'RED', note: 'Over WIP' },
  { code: 'M03', style: 'ST-1002', target: 750, actual: 705, efficiency: 81, wip: 62, status: 'AMBER', note: 'Reorder' },
  { code: 'M04', style: '—', target: 0, actual: 0, efficiency: 0, wip: 0, status: 'GREY', note: 'No plan today' },
];

export function FactoryDashboard() {
  const target = MODULES.reduce((s, m) => s + m.target, 0);
  const actual = MODULES.reduce((s, m) => s + m.actual, 0);
  const wip = MODULES.reduce((s, m) => s + m.wip, 0);

  return (
    <>
      <PageHeader
        title="Factory dashboard"
        description="Live production across all modules. Figures shown are demo data until the WIP engine is connected."
      />

      <div className="space-y-4 p-4 sm:p-6">
        <Card>
          <CardBody className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
            <Metric label="Target" value={target} />
            <Metric label="Actual" value={actual} />
            <Metric
              label="Achievement"
              value={target ? (actual / target) * 100 : null}
              decimals={0}
              suffix="%"
              status="AMBER"
            />
            <Metric label="WIP pieces" value={wip} />
          </CardBody>
        </Card>

        <div>
          <p className="eyebrow mb-2">Modules</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {MODULES.map((m) => (
              <Card key={m.code} signal={m.status}>
                <CardBody className="pt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xl uppercase tracking-[0.04em]">
                      {m.code}
                    </span>
                    <span className="font-mono text-xs text-muted">{m.style}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <Metric label="Actual" value={m.actual} size="sm" />
                    <Metric label="Target" value={m.target || null} size="sm" />
                    <Metric label="Efficiency" value={m.efficiency || null} suffix="%" size="sm" />
                    <Metric label="WIP" value={m.wip || null} size="sm" />
                  </div>

                  <div className="mt-4 border-t border-line pt-3">
                    <StatusChip status={m.status} label={m.note} />
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
