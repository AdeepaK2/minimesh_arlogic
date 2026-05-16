import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import type {
  CreateProjectRequest,
  UpdateProjectRequest,
} from './dto/project.dto';
import type { ProjectResponse, ProjectRow } from './projects.types';

@Injectable()
export class ProjectsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listProjects(userId: string): Promise<ProjectResponse[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .select('id,user_id,name,description,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      this.throwSupabaseError(error.message);
    }

    const rows = (data ?? []) as ProjectRow[];
    const sceneCounts = await this.getSceneCounts(userId);

    return rows.map((row) =>
      this.toProjectResponse(row, sceneCounts.get(row.id) ?? 0),
    );
  }

  async getProject(
    userId: string,
    projectId: string,
  ): Promise<ProjectResponse> {
    const row = await this.getOwnedProjectRow(userId, projectId);
    const sceneCounts = await this.getSceneCounts(userId, projectId);

    return this.toProjectResponse(row, sceneCounts.get(projectId) ?? 0);
  }

  async createProject(
    userId: string,
    request: CreateProjectRequest,
  ): Promise<ProjectResponse> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .insert({
        user_id: userId,
        name: request.name,
        description: request.description ?? null,
      })
      .select('id,user_id,name,description,created_at,updated_at')
      .single();

    if (error || !data) {
      this.throwSupabaseError(
        error?.message ?? 'Project could not be created.',
      );
    }

    return this.toProjectResponse(data, 0);
  }

  async updateProject(
    userId: string,
    projectId: string,
    request: UpdateProjectRequest,
  ): Promise<ProjectResponse> {
    if (Object.keys(request).length === 0) {
      throw new BadRequestException('No project updates were provided.');
    }

    await this.getOwnedProjectRow(userId, projectId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', userId)
      .select('id,user_id,name,description,created_at,updated_at')
      .single();

    if (error || !data) {
      this.throwSupabaseError(
        error?.message ?? 'Project could not be updated.',
      );
    }

    const sceneCounts = await this.getSceneCounts(userId, projectId);

    return this.toProjectResponse(data, sceneCounts.get(projectId) ?? 0);
  }

  async deleteProject(
    userId: string,
    projectId: string,
  ): Promise<{ id: string }> {
    await this.getOwnedProjectRow(userId, projectId);

    const { error } = await this.supabaseService
      .getClient()
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) {
      this.throwSupabaseError(error.message);
    }

    return { id: projectId };
  }

  async assertOwnedProject(userId: string, projectId: string): Promise<void> {
    await this.getOwnedProjectRow(userId, projectId);
  }

  private async getOwnedProjectRow(
    userId: string,
    projectId: string,
  ): Promise<ProjectRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('projects')
      .select('id,user_id,name,description,created_at,updated_at')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Project was not found.');
    }

    return data;
  }

  private async getSceneCounts(
    userId: string,
    projectId?: string,
  ): Promise<Map<string, number>> {
    let query = this.supabaseService
      .getClient()
      .from('scenes')
      .select('project_id')
      .eq('user_id', userId)
      .not('project_id', 'is', null);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      this.throwSupabaseError(error.message);
    }

    const counts = new Map<string, number>();

    for (const row of (data ?? []) as Array<{ project_id: string }>) {
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    }

    return counts;
  }

  private toProjectResponse(
    row: ProjectRow,
    sceneCount?: number,
  ): ProjectResponse {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sceneCount,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private throwSupabaseError(message: string): never {
    throw new InternalServerErrorException(message);
  }
}
