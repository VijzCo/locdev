import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function ScaffoldPage({
  title,
  description,
  nextSteps,
}: {
  title: string;
  description: string;
  nextSteps: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="space-y-4 p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-accent/10 text-accent">
              <Construction className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Module scaffold</h2>
              <p className="text-xs text-muted-foreground">
                This page is wired into the layout, navigation, and permissions but not yet
                implemented.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Build steps
            </div>
            <ol className="space-y-1.5 text-sm">
              {nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {(i + 1).toString().padStart(2, '0')}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
