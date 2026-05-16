import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
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
import { GenerateSceneResult, GenerationService } from './generation.service';

@Controller('generation')
@UseGuards(SupabaseAuthGuard)
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('scene')
  generateScene(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateRequest(body);

    return this.generationService.generateScene(request.prompt);
  }

  @Post('scene-edit')
  editScene(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateEditRequest(body);

    return this.generationService.editScene(request.scene, request.instruction);
  }

  @Post('entity-refinement')
  refineEntity(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateRefinementRequest(body);

    return this.generationService.refineEntity(
      request.scene,
      request.entityId,
      request.instruction,
    );
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
}
