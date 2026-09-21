import { EmptyState } from '@/components/common/States';

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-line bg-surface px-4 py-4 sm:px-6">
      <h1 className="font-display text-2xl uppercase tracking-[0.04em] leading-none">{title}</h1>
      {description && <p className="mt-1.5 max-w-prose text-sm text-muted">{description}</p>}
    </div>
  );
}

/**
 * Every route in the brief's navigation exists from Increment 1 so the
 * structure can be reviewed and walked before any screen is built. Each
 * placeholder names the increment that fills it.
 */
export function Placeholder({
  title,
  description,
  increment,
}: {
  title: string;
  description?: string;
  increment: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="p-4 sm:p-6">
        <EmptyState title={`Built in ${increment}`} />
      </div>
    </>
  );
}
