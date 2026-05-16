export const BILLING_PLAN_IDS = ['free', 'starter', 'pro'] as const;

export type BillingPlanId = (typeof BILLING_PLAN_IDS)[number];

export interface BillingPlanTier {
  id: BillingPlanId;
  label: string;
  priceUsd: number;
  /** Included generation tokens during the billing period after rollover. */
  monthlyTokenLimit: number;
}

export interface BillingPlanCatalog {
  /** How paid tier limits derive from PLAN_PAID_MONTHLY_TOKEN_USD. */
  basis: {
    freeMonthlyTokens: number;
    paidUsd: { starter: number; pro: number };
    /** Tokens computed as round(monthlyUsd * PLAN_PAID_MONTHLY_TOKEN_USD). */
    paidTokensPerUsd: number;
  };
  tiers: BillingPlanTier[];
}

export interface BillingUsageSnapshot extends BillingPlanCatalog {
  assignedPlanId: BillingPlanId;
  monthlyGenerationTokensUsed: number;
  /** ISO timestamp for the UTC month anchor that resets usage together with @see periodEndsAtUtc. */
  periodStartedAtUtc: string;
  periodEndsAtUtc: string;
  /** Same as tiers entry for assignedPlanId. */
  assignedTier: BillingPlanTier;
}
