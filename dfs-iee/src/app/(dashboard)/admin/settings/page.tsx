import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function SettingsPage() {
  return (
    <ScaffoldPage
      title="Settings"
      description="Factory hierarchy, machines, motion library, and buyers."
      nextSteps={[
        "Tabs: Factories | Departments | Lines | Machines | Motion Library | Buyers",
        "Each tab is a CRUD view against tenants/{tenantId}/{collection}",
        "Use the corresponding Zod schema from src/lib/validators",
        "Motion library is the foundation of the GSD/motion-analysis SMV feature",
        "Seeding script (functions/src/seed.ts) recommended for a starter motion library",
      ]}
    />
  );
}
