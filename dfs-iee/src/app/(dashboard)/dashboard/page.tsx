'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores/auth-store';
import { fmtNumber, fmtPct } from '@/lib/utils';
import {
  Activity,
  Layers,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// Placeholder data — wire up to real queries (TanStack Query) once
// styles/lineBalances collections are populated.
const SAMPLE_TREND = [
  { day: 'Mon', efficiency: 0.62, output: 2400 },
  { day: 'Tue', efficiency: 0.68, output: 2650 },
  { day: 'Wed', efficiency: 0.71, output: 2800 },
  { day: 'Thu', efficiency: 0.65, output: 2540 },
  { day: 'Fri', efficiency: 0.74, output: 2920 },
  { day: 'Sat', efficiency: 0.69, output: 2700 },
];

export default function DashboardPage() {
  const { user, tenant } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Welcome back, {user?.displayName.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plant overview for {tenant?.name}
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Plant efficiency"
          value={fmtPct(0.69)}
          icon={<Activity className="h-4 w-4" />}
          delta="+4.2% vs last week"
          deltaPositive
        />
        <KpiCard
          label="Today's output"
          value={fmtNumber(2740, 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          delta="Target: 3,000"
        />
        <KpiCard
          label="Active styles"
          value="12"
          icon={<Layers className="h-4 w-4" />}
          delta="3 in development"
        />
        <KpiCard
          label="Avg CM / unit"
          value="$1.42"
          icon={<DollarSign className="h-4 w-4" />}
          delta="−2.1% vs last month"
          deltaPositive
        />
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily efficiency trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SAMPLE_TREND}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="efficiency"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="output"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Placeholder data. Wire this chart to your live production data once you have
            factory daily output records in Firestore.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaPositive,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: string;
  deltaPositive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="grid h-7 w-7 place-items-center rounded bg-accent/10 text-accent">
            {icon}
          </div>
        </div>
        <div className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</div>
        {delta && (
          <div
            className={`mt-1 text-xs ${deltaPositive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
          >
            {delta}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
