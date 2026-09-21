import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Activity, Cpu, BarChart3, Layers } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Blueprint grid background */}
      <div className="absolute inset-0 bg-blueprint opacity-30" aria-hidden />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="border-b bg-background/60 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded bg-primary text-primary-foreground">
                <span className="font-display text-sm font-bold">IE</span>
              </div>
              <span className="font-display text-lg font-bold tracking-tight">SMV Platform</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="container mx-auto px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              For apparel manufacturing IE teams
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
              SMV, costing, and line balancing.
              <br />
              <span className="text-accent">Built for the floor.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Generate accurate Standard Minute Values from motion analysis or stopwatch
              study. Cost styles with confidence. Balance lines without spreadsheets.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature grid */}
          <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Cpu className="h-5 w-5" />}
              title="SMV Engine"
              body="Stopwatch, motion analysis, and machine-based SMV — with audit-ready calculations."
            />
            <FeatureCard
              icon={<Layers className="h-5 w-5" />}
              title="Operation Bulletin"
              body="Sequence operations, allocate machines, and approve the bulletin in one place."
            />
            <FeatureCard
              icon={<Activity className="h-5 w-5" />}
              title="Line Balancing"
              body="Auto-balance with bottleneck detection. Visualize load factor per station."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="CM & Margin"
              body="Real-time costing with CPM, overhead, and trims. Quote with confidence."
            />
          </div>
        </section>

        <footer className="border-t py-8">
          <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} SMV Platform · Industrial Engineering software for apparel
          </div>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
