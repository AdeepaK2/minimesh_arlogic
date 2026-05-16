import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { BillingService } from './billing.service';
import type { BillingPlanCatalog, BillingUsageSnapshot } from './billing.types';
import { SetBillingPlanRequestSchema } from './dto/set-billing-plan.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /** Pricing catalog derived from PLAN_* env vars; no authentication required. */
  @Get('plans')
  getPlans(): BillingPlanCatalog {
    return this.billingService.describePlans();
  }

  /** Current plan allowance and usage counters for signed-in profiles. */
  @UseGuards(SupabaseAuthGuard)
  @Get('usage')
  async getUsage(@Req() request: AuthenticatedRequest): Promise<BillingUsageSnapshot> {
    return this.billingService.resolveUsageSnapshot(request.authUser.id);
  }

  /**
   * Select a plan tier — checkout is intentionally skipped for MVP:
   * this updates the entitlement row so higher limits apply immediately after payment integration.
   */
  @UseGuards(SupabaseAuthGuard)
  @Patch('plan')
  async setPlan(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ): Promise<BillingUsageSnapshot> {
    try {
      const dto = SetBillingPlanRequestSchema.parse(body);

      return await this.billingService.setBillingPlan(request.authUser.id, dto.plan);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid billing plan request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
