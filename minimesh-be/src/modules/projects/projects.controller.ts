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
  CreateProjectRequest,
  CreateProjectRequestSchema,
  UpdateProjectRequest,
  UpdateProjectRequestSchema,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects(@Req() request: AuthenticatedRequest) {
    return this.projectsService.listProjects(request.authUser.id);
  }

  @Get(':id')
  getProject(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.getProject(request.authUser.id, projectId);
  }

  @Post()
  createProject(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.projectsService.createProject(
      request.authUser.id,
      this.validateBody(CreateProjectRequestSchema, body),
    );
  }

  @Patch(':id')
  updateProject(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Body() body: unknown,
  ) {
    return this.projectsService.updateProject(
      request.authUser.id,
      projectId,
      this.validateBody(UpdateProjectRequestSchema, body),
    );
  }

  @Delete(':id')
  deleteProject(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.deleteProject(request.authUser.id, projectId);
  }

  private validateBody<T>(
    schema: ZodType<T>,
    body: unknown,
  ): T extends CreateProjectRequest
    ? CreateProjectRequest
    : UpdateProjectRequest {
    try {
      return schema.parse(body) as T extends CreateProjectRequest
        ? CreateProjectRequest
        : UpdateProjectRequest;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid project request.',
          errors: error.issues.map((issue) => issue.message),
        });
      }

      throw error;
    }
  }
}
