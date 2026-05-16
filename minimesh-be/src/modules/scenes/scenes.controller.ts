import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError, ZodType } from 'zod';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import {
  CreateSceneRequest,
  CreateSceneRequestSchema,
  SaveSceneVersionRequest,
  SaveSceneVersionRequestSchema,
  UpdateSceneRequest,
  UpdateSceneRequestSchema,
} from './dto/scene.dto';
import { ScenesService } from './scenes.service';

@Controller('projects/:projectId/scenes')
@UseGuards(SupabaseAuthGuard)
export class ScenesController {
  constructor(private readonly scenesService: ScenesService) {}

  @Get()
  listScenes(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    return this.scenesService.listScenes(request.authUser.id, projectId);
  }

  @Get(':id')
  getScene(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('id') sceneId: string,
  ) {
    return this.scenesService.getScene(request.authUser.id, projectId, sceneId);
  }

  @Get(':id/versions')
  listVersions(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('id') sceneId: string,
  ) {
    return this.scenesService.listVersions(
      request.authUser.id,
      projectId,
      sceneId,
    );
  }

  @Post()
  createScene(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    return this.scenesService.createScene(
      request.authUser.id,
      projectId,
      this.validateBody(CreateSceneRequestSchema, body),
    );
  }

  @Post(':id/versions')
  saveVersion(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('id') sceneId: string,
    @Body() body: unknown,
  ) {
    return this.scenesService.saveVersion(
      request.authUser.id,
      projectId,
      sceneId,
      this.validateBody(SaveSceneVersionRequestSchema, body),
    );
  }

  @Patch(':id')
  updateScene(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('id') sceneId: string,
    @Body() body: unknown,
  ) {
    return this.scenesService.updateScene(
      request.authUser.id,
      projectId,
      sceneId,
      this.validateBody(UpdateSceneRequestSchema, body),
    );
  }

  @Delete(':id')
  deleteScene(
    @Req() request: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Param('id') sceneId: string,
  ) {
    return this.scenesService.deleteScene(
      request.authUser.id,
      projectId,
      sceneId,
    );
  }

  private validateBody<T>(
    schema: ZodType<T>,
    body: unknown,
  ): T extends CreateSceneRequest
    ? CreateSceneRequest
    : T extends SaveSceneVersionRequest
      ? SaveSceneVersionRequest
      : UpdateSceneRequest {
    try {
      return schema.parse(body) as T extends CreateSceneRequest
        ? CreateSceneRequest
        : T extends SaveSceneVersionRequest
          ? SaveSceneVersionRequest
          : UpdateSceneRequest;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid scene request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
