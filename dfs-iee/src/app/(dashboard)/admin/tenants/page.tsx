import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function TenantPage() {
  return (
    <ScaffoldPage
      title="Tenant"
      description="Company-level settings — branding, currency, default language."
      nextSteps={[
        "Read tenant doc from useAuthStore (it's already subscribed via onSnapshot)",
        "Build a form for: name, country, currency, defaultLanguage, branding (logo upload)",
        "Logo upload uses Firebase Storage at users/{userId}/avatar or tenants/{tenantId}/branding",
        "Save via a Cloud Function that re-validates permissions server-side",
        "Show subscription info (plan, status, trialEndsAt) with a link to /admin/subscriptions",
      ]}
    />
  );
}
