import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import {
  ApprovedReferenceRequest,
  ApprovedReferenceRequestSchema,
} from './dto/approved-reference.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(SupabaseAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post('approved-references')
  approveReference(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown,
  ) {
    return this.templatesService.approveReference(
      request.authUser.id,
      this.validateApprovalRequest(body),
    );
  }

  @Get('approved-references')
  listApprovedReferences(
    @Query('query') query = '',
    @Query('limit') limit = '12',
  ) {
    return this.templatesService.searchApprovedReferences(
      query,
      Number(limit) || 12,
    );
  }

  private validateApprovalRequest(body: unknown): ApprovedReferenceRequest {
    try {
      return ApprovedReferenceRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid approved reference request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
