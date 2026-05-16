import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase/supabase.service';
import type { GenerationUsage } from '../generation/generation-context.types';
import type {
  BillingPlanCatalog,
  BillingPlanId,
  BillingUsageSnapshot,
} from './billing.types';
import { tallyGenerationTokens } from './generation-token-tally';

interface ProfileBillingRow {
  billing_plan: string | null;
  monthly_generation_tokens_used: number | null;
  billing_usage_period_start: string | null;
}

const STARTER_USD = 10;
const PRO_USD = 100;

/** Start of UTC month immediately after anchor (exclusive rollover boundary). */
function nextUtcMonthBoundary(periodStartUtc: Date): Date {
  return new Date(
    Date.UTC(
      periodStartUtc.getUTCFullYear(),
      periodStartUtc.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    ),
  );
}

/** Start of the UTC calendar month containing `date`. */
function utcMonthContaining(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );
}

@Injectable()
export class BillingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  describePlans(): BillingPlanCatalog {
    const freeMonthlyTokens = this.requirePositiveEnvInt(
      'PLAN_FREE_MONTHLY_TOKENS',
      10_000,
    );

    const paidTokensPerUsd = this.requirePositiveEnvInt(
      'PLAN_PAID_MONTHLY_TOKEN_USD',
      15_000,
    );

    const starterTokens =
      paidTokensPerUsd > 0
        ? Math.round(STARTER_USD * paidTokensPerUsd)
        : freeMonthlyTokens;
    const proTokens =
      paidTokensPerUsd > 0
        ? Math.round(PRO_USD * paidTokensPerUsd)
        : starterTokens * 10;

    return {
      basis: {
        freeMonthlyTokens,
        paidUsd: { starter: STARTER_USD, pro: PRO_USD },
        paidTokensPerUsd,
      },
      tiers: [
        {
          id: 'free',
          label: 'Free',
          priceUsd: 0,
          monthlyTokenLimit: freeMonthlyTokens,
        },
        {
          id: 'starter',
          label: 'Starter',
          priceUsd: STARTER_USD,
          monthlyTokenLimit: starterTokens,
        },
        {
          id: 'pro',
          label: 'Pro',
          priceUsd: PRO_USD,
          monthlyTokenLimit: proTokens,
        },
      ],
    };
  }

  tokenLimit(planId: BillingPlanId): number {
    const catalog = this.describePlans();
    const tier = catalog.tiers.find((t) => t.id === planId);

    return tier?.monthlyTokenLimit ?? catalog.basis.freeMonthlyTokens;
  }

  async resolveUsageSnapshot(userId: string): Promise<BillingUsageSnapshot> {
    await this.bootstrapProfile(userId);

    let row = await this.fetchBillingRow(userId);

    row = await this.reconcilePeriodIfStale(userId, row);

    const catalog = this.describePlans();
    const planId = this.normalizePlanId(row.billing_plan);
    const used = Math.max(
      0,
      Number.isFinite(row.monthly_generation_tokens_used)
        ? Number(row.monthly_generation_tokens_used)
        : 0,
    );

    const periodIso = row.billing_usage_period_start as string;

    const periodStart = new Date(periodIso);
    const periodEnds = nextUtcMonthBoundary(periodStart);

    const assignedTier =
      catalog.tiers.find((t) => t.id === planId) ?? catalog.tiers[0];

    return {
      ...catalog,
      assignedPlanId: planId,
      monthlyGenerationTokensUsed: used,
      periodStartedAtUtc: periodStart.toISOString(),
      periodEndsAtUtc: periodEnds.toISOString(),
      assignedTier,
    };
  }

  async assertQuotaAvailable(userId: string): Promise<BillingUsageSnapshot> {
    const snapshot = await this.resolveUsageSnapshot(userId);
    const { assignedTier } = snapshot;
    const used = snapshot.monthlyGenerationTokensUsed;

    if (used >= assignedTier.monthlyTokenLimit) {
      throw new HttpException(
        `Generation quota reached for "${assignedTier.label}". Your usage resets after ${snapshot.periodEndsAtUtc} (UTC) or choose a larger plan.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return snapshot;
  }

  /** Persists summed LLM tokens for this successful generation invocation. */
  async recordGenerationUsage(
    userId: string,
    usage?: GenerationUsage,
  ): Promise<void> {
    const delta = tallyGenerationTokens(usage);

    if (delta <= 0) {
      return;
    }

    await this.bootstrapProfile(userId);

    let row = await this.fetchBillingRow(userId);

    row = await this.reconcilePeriodIfStale(userId, row);

    const prev = Math.max(
      0,
      Number.isFinite(row.monthly_generation_tokens_used)
        ? Number(row.monthly_generation_tokens_used)
        : 0,
    );

    const { error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update({
        monthly_generation_tokens_used: prev + delta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new BadRequestException(
        `Billing usage could not be updated: ${error.message}`,
      );
    }
  }

  /** Sets user's plan tier (payments not integrated — activates allowance for demos). */
  async setBillingPlan(userId: string, plan: BillingPlanId): Promise<BillingUsageSnapshot> {
    await this.bootstrapProfile(userId);

    const { error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .update({
        billing_plan: plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return this.resolveUsageSnapshot(userId);
  }

  private normalizePlanId(plan: string | null): BillingPlanId {
    const v = plan?.trim()?.toLowerCase();

    if (v === 'starter' || v === 'pro') {
      return v;
    }

    return 'free';
  }

  private async bootstrapProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        `profiles lookup failed during billing bootstrap: ${error.message}`,
      );
    }

    if (data) {
      return;
    }

    const periodStartIso = utcMonthContaining(new Date()).toISOString();

    const { error: insertError } = await this.supabaseService
      .getClient()
      .from('profiles')
      .insert({
        id: userId,
        billing_plan: 'free',
        billing_usage_period_start: periodStartIso,
        monthly_generation_tokens_used: 0,
      });

    if (insertError) {
      throw new BadRequestException(
        `profiles row missing and could not be created: ${insertError.message}`,
      );
    }
  }

  private async fetchBillingRow(userId: string): Promise<ProfileBillingRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select(
        `
        billing_plan,
        monthly_generation_tokens_used,
        billing_usage_period_start
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        `profiles lookup failed during billing fetch: ${error.message}`,
      );
    }

    if (!data) {
      throw new NotFoundException('Profile was not found for billing.');
    }

    return data as ProfileBillingRow;
  }

  private async reconcilePeriodIfStale(
    userId: string,
    row: ProfileBillingRow,
  ): Promise<ProfileBillingRow> {
    let periodIso = row.billing_usage_period_start;

    if (!periodIso) {
      periodIso = utcMonthContaining(new Date()).toISOString();

      await this.supabaseService
        .getClient()
        .from('profiles')
        .update({
          billing_usage_period_start: periodIso,
          monthly_generation_tokens_used: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return {
        ...row,
        billing_usage_period_start: periodIso,
        monthly_generation_tokens_used: 0,
      };
    }

    const now = new Date();
    const periodStart = new Date(periodIso);

    const nextBoundary = nextUtcMonthBoundary(periodStart);

    if (now >= nextBoundary) {
      const freshStartIso = utcMonthContaining(now).toISOString();

      const { error } = await this.supabaseService.getClient().from('profiles').update({
        billing_usage_period_start: freshStartIso,
        monthly_generation_tokens_used: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) {
        throw new BadRequestException(
          `Could not rollover billing usage period: ${error.message}`,
        );
      }

      return {
        ...row,
        billing_usage_period_start: freshStartIso,
        monthly_generation_tokens_used: 0,
      };
    }

    return row;
  }

  private requirePositiveEnvInt(envKey: string, fallback: number): number {
    const raw = this.configService.get<string | number | undefined>(envKey);
    const coerced =
      typeof raw === 'number' ? raw : raw != null && raw !== '' ? Number(raw) : NaN;

    if (!Number.isFinite(coerced) || coerced < 1) {
      return Math.max(1, Math.floor(fallback));
    }

    return Math.floor(coerced);
  }
}
