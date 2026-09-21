import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function StylesPage() {
  return (
    <ScaffoldPage
      title="Styles"
      description="Manage style master data — buyer, FOB, target SMV/CM, status."
      nextSteps={[
        "Use TanStack Query + Firestore onSnapshot on `tenants/{tenantId}/styles`",
        "Filter by factoryId (use useAuthStore for current user's factoryAccess)",
        "Build a styles list table with status pills, search, and a New Style modal",
        "Wire the form to styleSchema (in src/lib/validators) and the styles collection",
        "Add a [styleId] detail page with tabs: Overview, Operations, OB, Costing",
      ]}
    />
  );
}
