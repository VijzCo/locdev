import type { PlanLimits, SubscriptionPlan } from '@/types';

/**
 * Subscription plan definitions.
 *
 * These limits are enforced on the server side in Cloud Functions
 * before any quota-bound write (creating a style, inviting a user, etc.).
 * The client uses them for UI affordances (disabling buttons, showing
 * upgrade prompts), but server enforcement is authoritative.
 */

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxUsers: 3,
    maxFactories: 1,
    maxStylesPerMonth: 10,
    maxOperationsPerStyle: 50,
    aiSuggestions: false,
    excelImport: false,
    pdfExport: true,
    apiAccess: false,
    chatEnabled: false,
    advancedAnalytics: false,
  },
  premium: {
    maxUsers: 25,
    maxFactories: 3,
    maxStylesPerMonth: 200,
    maxOperationsPerStyle: 200,
    aiSuggestions: true,
    excelImport: true,
    pdfExport: true,
    apiAccess: false,
    chatEnabled: true,
    advancedAnalytics: true,
  },
  enterprise: {
    maxUsers: Number.MAX_SAFE_INTEGER,
    maxFactories: Number.MAX_SAFE_INTEGER,
    maxStylesPerMonth: Number.MAX_SAFE_INTEGER,
    maxOperationsPerStyle: Number.MAX_SAFE_INTEGER,
    aiSuggestions: true,
    excelImport: true,
    pdfExport: true,
    apiAccess: true,
    chatEnabled: true,
    advancedAnalytics: true,
  },
};

export interface PlanDisplay {
  id: SubscriptionPlan;
  name: string;
  description: string;
  priceMonthly: number; // USD
  highlightedFeatures: string[];
  stripePriceId?: string;
}

export const PLAN_CATALOG: PlanDisplay[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For small workshops and pilots',
    priceMonthly: 0,
    highlightedFeatures: [
      'Up to 3 users',
      '1 factory',
      '10 styles per month',
      'Basic SMV calculator',
      'PDF export',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For growing apparel factories',
    priceMonthly: 49,
    highlightedFeatures: [
      'Up to 25 users',
      '3 factories',
      '200 styles per month',
      'AI SMV suggestions',
      'Excel import/export',
      'Internal chat',
      'Advanced analytics',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-factory groups',
    priceMonthly: 199,
    highlightedFeatures: [
      'Unlimited users & factories',
      'Unlimited styles',
      'API access',
      'Priority support',
      'Custom integrations',
      'SSO & audit logs',
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
  },
];
