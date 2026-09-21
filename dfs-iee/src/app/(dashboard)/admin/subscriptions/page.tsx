import { ScaffoldPage } from '@/components/shared/scaffold-page';

export default function SubscriptionsPage() {
  return (
    <ScaffoldPage
      title="Billing"
      description="Manage your subscription plan and payment method via Stripe."
      nextSteps={[
        "Show PLAN_CATALOG (in src/config/plans) with current plan highlighted",
        "On Upgrade click, POST to /api/stripe/create-checkout-session and redirect to Stripe Checkout",
        "Add a Stripe webhook handler at /api/stripe/webhook that updates the tenant.subscription doc",
        "Use stripe.billingPortal.sessions.create() for customer self-serve",
        "Server enforces subscription limits on every quota-bound write in Cloud Functions",
      ]}
    />
  );
}
