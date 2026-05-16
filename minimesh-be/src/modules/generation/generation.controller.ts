import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import {
  GenerateSceneRequest,
  GenerateSceneRequestSchema,
} from './dto/generate-scene.dto';
import { GenerateSceneResult, GenerationService } from './generation.service';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('scene')
  generateScene(@Body() body: unknown): Promise<GenerateSceneResult> {
    const request = this.validateRequest(body);

    return this.generationService.generateScene(request.prompt);
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
}
