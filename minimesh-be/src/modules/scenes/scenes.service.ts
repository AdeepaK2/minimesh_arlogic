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
  SceneMemoryMetadata,
  SceneRow,
  SceneVersionResponse,
  SceneVersionRow,
} from './scenes.types';

const SCENE_SELECT_FIELDS =
  'id,project_id,user_id,name,description,latest_scene_json,latest_prompt,latest_version_number,chat_context_summary,chat_context_updated_at,estimated_input_tokens,estimated_output_tokens,provider_input_tokens,provider_output_tokens,created_at,updated_at';

const VERSION_SELECT_FIELDS =
  'id,scene_id,user_id,version_number,prompt,scene_json,warnings,chat_context_summary,chat_context_updated_at,estimated_input_tokens,estimated_output_tokens,provider_input_tokens,provider_output_tokens,created_at';

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
      .select(SCENE_SELECT_FIELDS)
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
      .select(VERSION_SELECT_FIELDS)
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
    const memoryFields = this.memoryFieldsFromUsage(request.usage);
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
        ...memoryFields,
      })
      .select(SCENE_SELECT_FIELDS)
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
        ...memoryFields,
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
    const memoryFields = this.memoryFieldsFromUsage(
      request.usage,
      existingScene,
    );

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
        ...memoryFields,
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
        ...memoryFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sceneId)
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .select(SCENE_SELECT_FIELDS)
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
      .select(SCENE_SELECT_FIELDS)
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
      .select(SCENE_SELECT_FIELDS)
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
      memory: this.toMemoryMetadata(row),
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
      memory: this.toMemoryMetadata(row),
      createdAt: row.created_at,
    };
  }

  private memoryFieldsFromUsage(
    usage: CreateSceneRequest['usage'] | SaveSceneVersionRequest['usage'],
    existing?: SceneRow,
  ) {
    const compactSummary =
      usage?.memory?.compactSummary ?? existing?.chat_context_summary ?? null;
    const compactedAt =
      usage?.memory?.compactedAt ?? existing?.chat_context_updated_at ?? null;

    return {
      chat_context_summary: compactSummary,
      chat_context_updated_at: compactedAt,
      estimated_input_tokens:
        usage?.estimatedInputTokens ?? existing?.estimated_input_tokens ?? null,
      estimated_output_tokens:
        usage?.estimatedOutputTokens ??
        existing?.estimated_output_tokens ??
        null,
      provider_input_tokens:
        usage?.providerInputTokens ?? existing?.provider_input_tokens ?? null,
      provider_output_tokens:
        usage?.providerOutputTokens ?? existing?.provider_output_tokens ?? null,
    };
  }

  private toMemoryMetadata(
    row: SceneRow | SceneVersionRow,
  ): SceneMemoryMetadata {
    return {
      chatContextSummary: row.chat_context_summary ?? null,
      chatContextUpdatedAt: row.chat_context_updated_at ?? null,
      estimatedInputTokens: row.estimated_input_tokens ?? null,
      estimatedOutputTokens: row.estimated_output_tokens ?? null,
      providerInputTokens: row.provider_input_tokens ?? null,
      providerOutputTokens: row.provider_output_tokens ?? null,
    };
  }

  private throwSupabaseError(message: string): never {
    throw new InternalServerErrorException(message);
  }
}
