import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import {
  LogicalGltfDocumentSchema,
  type BuiltGltfDocument,
} from '../../schemas/logical-gltf.schema';
import {
  ClarifySceneRequest,
  ClarifySceneRequestSchema,
} from './dto/clarify-scene.dto';
import {
  EditSceneRequest,
  EditSceneRequestSchema,
} from './dto/edit-scene.dto';
import {
  GenerateSceneRequest,
  GenerateSceneRequestSchema,
} from './dto/generate-scene.dto';
import {
  RefineEntityRequest,
  RefineEntityRequestSchema,
} from './dto/refine-entity.dto';
import {
  GenerateSceneResult,
  GenerationService,
} from './generation.service';
import type { GenerationClarificationResult } from './generation.service';
import {
  GenerationJobRequestDto,
  GenerationJobRequestSchema,
} from './dto/generation-job.dto';
import { GenerationJobsService } from './generation-jobs.service';
import type { GenerationJobResponse } from './generation-job.types';
import { GltfBuilderService } from './gltf-builder.service';

@Controller('generation')
@UseGuards(SupabaseAuthGuard)
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly generationJobsService: GenerationJobsService,
    private readonly gltfBuilderService: GltfBuilderService,
  ) {}

  @Post('clarify')
  clarifyScene(
    @Body() body: unknown,
  ): GenerationClarificationResult {
    const request = this.validateClarificationRequest(body);

    return this.generationService.clarifyScenePrompt(request.prompt);
  }

  @Post('scene')
  generateScene(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateRequest(body);

    return this.generationService.generateScene(
      request.prompt,
      request.chatContext,
    );
  }

  @Post('scene-edit')
  editScene(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateEditRequest(body);

    return this.generationService.editScene(
      request.scene,
      request.instruction,
      request.chatContext,
    );
  }

  @Post('entity-refinement')
  refineEntity(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateRefinementRequest(body);

    return this.generationService.refineEntity(
      request.scene,
      request.entityId,
      request.instruction,
      request.chatContext,
    );
  }

  @Post('jobs')
  createJob(@Body() body: unknown): GenerationJobResponse {
    const request = this.validateJobRequest(body);

    return this.generationJobsService.createJob(request);
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string): GenerationJobResponse {
    const job = this.generationJobsService.getJob(jobId);

    if (!job) {
      throw new NotFoundException({
        message: 'Generation job was not found.',
      });
    }

    return job;
  }

  @Post('rebuild-gltf')
  rebuildGltf(@Body() body: unknown): BuiltGltfDocument {
    try {
      const logicalGltf = LogicalGltfDocumentSchema.parse(body);
      return this.gltfBuilderService.build(logicalGltf);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid logical glTF document.',
          errors: error.issues.map((issue) => issue.message),
        });
      }
      throw error;
    }
  }

  private validateClarificationRequest(body: unknown): ClarifySceneRequest {
    try {
      return ClarifySceneRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid clarification request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }

  private validateRequest(body: unknown): GenerateSceneRequest {
    try {
      return GenerateSceneRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid generation request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }

  private validateEditRequest(body: unknown): EditSceneRequest {
    try {
      return EditSceneRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid scene edit request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }

  private validateRefinementRequest(body: unknown): RefineEntityRequest {
    try {
      return RefineEntityRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid entity refinement request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }

  private validateJobRequest(body: unknown): GenerationJobRequestDto {
    try {
      return GenerationJobRequestSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid generation job request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
