import { z } from 'zod';
import type { BillingPlanId } from '../billing.types';

const PLAN_OPTIONS = ['free', 'starter', 'pro'] as [
  BillingPlanId,
  BillingPlanId,
  BillingPlanId,
];

export const SetBillingPlanRequestSchema = z.object({
  plan: z.enum(PLAN_OPTIONS),
});

export type SetBillingPlanRequestDto = z.infer<
  typeof SetBillingPlanRequestSchema
>;
