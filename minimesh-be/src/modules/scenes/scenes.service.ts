import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import { SceneDocumentSchema } from '../../schemas/scene.schema';
import { ProjectsService } from '../projects/projects.service';
import type {
  CreateSceneRequest,
  SaveSceneVersionRequest,
  UpdateSceneRequest,
} from './dto/scene.dto';
import type {
  SavedSceneResponse,
  SceneRow,
  SceneVersionResponse,
  SceneVersionRow,
} from './scenes.types';

@Injectable()
export class ScenesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly projectsService: ProjectsService,
  ) {}

  async listScenes(
    userId: string,
    projectId: string,
  ): Promise<SavedSceneResponse[]> {
    await this.projectsService.assertOwnedProject(userId, projectId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('scenes')
      .select(
        'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,created_at,updated_at',
      )
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) {
      this.throwSupabaseError(error.message);
    }

    return ((data ?? []) as SceneRow[]).map((row) => this.toSceneResponse(row));
  }

  async getScene(
    userId: string,
    projectId: string,
    sceneId: string,
  ): Promise<SavedSceneResponse> {
    const row = await this.getOwnedSceneRow(userId, projectId, sceneId);

    return this.toSceneResponse(row);
  }

  async listVersions(
    userId: string,
    projectId: string,
    sceneId: string,
  ): Promise<SceneVersionResponse[]> {
    await this.getOwnedSceneRow(userId, projectId, sceneId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('scene_versions')
      .select(
        'id,scene_id,user_id,version_number,prompt,scene_json,warnings,created_at',
      )
      .eq('user_id', userId)
      .eq('scene_id', sceneId)
      .order('version_number', { ascending: false });

    if (error) {
      this.throwSupabaseError(error.message);
    }

    return ((data ?? []) as SceneVersionRow[]).map((row) =>
      this.toVersionResponse(row),
    );
  }

  async createScene(
    userId: string,
    projectId: string,
    request: CreateSceneRequest,
  ): Promise<SavedSceneResponse> {
    await this.projectsService.assertOwnedProject(userId, projectId);

    const scene = SceneDocumentSchema.parse(request.scene);
    const { data: sceneRow, error: sceneError } = await this.supabaseService
      .getClient()
      .from('scenes')
      .insert({
        user_id: userId,
        project_id: projectId,
        name: request.name,
        description: request.description ?? scene.description ?? null,
        latest_scene_json: scene,
        latest_prompt: request.prompt ?? null,
        latest_version_number: 1,
      })
      .select(
        'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,created_at,updated_at',
      )
      .single();

    if (sceneError || !sceneRow) {
      this.throwSupabaseError(
        sceneError?.message ?? 'Scene could not be saved.',
      );
    }

    const typedSceneRow = sceneRow;
    const { error: versionError } = await this.supabaseService
      .getClient()
      .from('scene_versions')
      .insert({
        scene_id: typedSceneRow.id,
        user_id: userId,
        version_number: 1,
        prompt: request.prompt ?? null,
        scene_json: scene,
        warnings: request.warnings,
      });

    if (versionError) {
      await this.supabaseService
        .getClient()
        .from('scenes')
        .delete()
        .eq('id', typedSceneRow.id)
        .eq('user_id', userId);
      this.throwSupabaseError(versionError.message);
    }

    return this.toSceneResponse(typedSceneRow);
  }

  async saveVersion(
    userId: string,
    projectId: string,
    sceneId: string,
    request: SaveSceneVersionRequest,
  ): Promise<SavedSceneResponse> {
    const existingScene = await this.getOwnedSceneRow(
      userId,
      projectId,
      sceneId,
    );
    const scene = SceneDocumentSchema.parse(request.scene);
    const nextVersion = existingScene.latest_version_number + 1;

    const { error: versionError } = await this.supabaseService
      .getClient()
      .from('scene_versions')
      .insert({
        scene_id: sceneId,
        user_id: userId,
        version_number: nextVersion,
        prompt: request.prompt ?? null,
        scene_json: scene,
        warnings: request.warnings,
      });

    if (versionError) {
      this.throwSupabaseError(versionError.message);
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('scenes')
      .update({
        latest_scene_json: scene,
        latest_prompt: request.prompt ?? existingScene.latest_prompt,
        latest_version_number: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sceneId)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select(
        'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,created_at,updated_at',
      )
      .single();

    if (error || !data) {
      this.throwSupabaseError(
        error?.message ?? 'Scene version could not be saved.',
      );
    }

    return this.toSceneResponse(data);
  }

  async updateScene(
    userId: string,
    projectId: string,
    sceneId: string,
    request: UpdateSceneRequest,
  ): Promise<SavedSceneResponse> {
    if (Object.keys(request).length === 0) {
      throw new BadRequestException('No scene updates were provided.');
    }

    await this.getOwnedSceneRow(userId, projectId, sceneId);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('scenes')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sceneId)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select(
        'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,created_at,updated_at',
      )
      .single();

    if (error || !data) {
      this.throwSupabaseError(error?.message ?? 'Scene could not be updated.');
    }

    return this.toSceneResponse(data);
  }

  async deleteScene(
    userId: string,
    projectId: string,
    sceneId: string,
  ): Promise<{ id: string }> {
    await this.getOwnedSceneRow(userId, projectId, sceneId);

    const { error } = await this.supabaseService
      .getClient()
      .from('scenes')
      .delete()
      .eq('id', sceneId)
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      this.throwSupabaseError(error.message);
    }

    return { id: sceneId };
  }

  private async getOwnedSceneRow(
    userId: string,
    projectId: string,
    sceneId: string,
  ): Promise<SceneRow> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('scenes')
      .select(
        'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,created_at,updated_at',
      )
      .eq('id', sceneId)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Scene was not found.');
    }

    return data;
  }

  private toSceneResponse(row: SceneRow): SavedSceneResponse {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      latestScene: SceneDocumentSchema.parse(row.latest_scene_json),
      latestPrompt: row.latest_prompt,
      latestVersionNumber: row.latest_version_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toVersionResponse(row: SceneVersionRow): SceneVersionResponse {
    return {
      id: row.id,
      sceneId: row.scene_id,
      versionNumber: row.version_number,
      prompt: row.prompt,
      scene: SceneDocumentSchema.parse(row.scene_json),
      warnings: row.warnings,
      createdAt: row.created_at,
    };
  }

  private throwSupabaseError(message: string): never {
    throw new InternalServerErrorException(message);
  }
}
