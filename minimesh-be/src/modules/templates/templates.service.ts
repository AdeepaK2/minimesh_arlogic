import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../../ai/embeddings/embeddings.types';
import { SceneFragmentSchema } from '../../schemas/scene-fragment.schema';
import type {
  CreateObjectTemplateRequest,
  ObjectTemplateResponse,
  ObjectTemplateSearchResult,
  UpdateObjectTemplateRequest,
} from './dto/object-template.dto';
import type {
  ObjectTemplate,
  TemplateRow,
  TemplateSearchResult,
} from './templates.types';

interface SupabaseRpcResponse {
  data: unknown;
  error: unknown;
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(EMBEDDINGS_PROVIDER)
    private readonly embeddingsProvider: EmbeddingsProvider,
  ) {}

  async listObjectTemplates(): Promise<ObjectTemplateResponse[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .select(
        'id, name, category, description, tags, scene_json_fragment, is_public, created_at, updated_at, template_embeddings(template_id)',
      )
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      throw new InternalServerErrorException(
        'Could not load object templates.',
      );
    }

    return data.map((row) => {
      const record = row as TemplateRow & {
        template_embeddings?: { template_id: string } | { template_id: string }[] | null;
      };
      const embeddingLink = record.template_embeddings;
      const hasEmbedding = Array.isArray(embeddingLink)
        ? embeddingLink.length > 0
        : Boolean(embeddingLink?.template_id);

      return {
        id: record.id,
        name: record.name,
        category: record.category,
        description: record.description,
        tags: record.tags ?? [],
        sceneJsonFragment: record.scene_json_fragment,
        isPublic: record.is_public,
        hasEmbedding,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
      };
    });
  }

  async createObjectTemplate(
    input: CreateObjectTemplateRequest,
  ): Promise<ObjectTemplateResponse> {
    const client = this.supabaseService.getClient();
    const { data: inserted, error: insertError } = await client
      .from('object_templates')
      .insert({
        name: input.name,
        category: input.category,
        description: input.description,
        tags: input.tags,
        scene_json_fragment: input.sceneJsonFragment,
        is_public: input.isPublic,
      })
      .select('*')
      .single();

    if (insertError || !inserted) {
      if (
        typeof insertError === 'object' &&
        insertError !== null &&
        'code' in insertError &&
        insertError.code === '23505'
      ) {
        throw new ConflictException(
          'An object template with this name already exists.',
        );
      }

      throw new InternalServerErrorException(
        'Could not save object template.',
      );
    }

    const row = inserted as TemplateRow;

    try {
      await this.upsertTemplateEmbedding(row.id, input);
    } catch {
      await client.from('object_templates').delete().eq('id', row.id);
      throw new InternalServerErrorException(
        'Template saved but vector embedding failed. Try again.',
      );
    }

    return this.mapTemplateResponse(row, true);
  }

  async updateObjectTemplate(
    id: string,
    input: UpdateObjectTemplateRequest,
  ): Promise<ObjectTemplateResponse> {
    const client = this.supabaseService.getClient();
    const { data: updated, error: updateError } = await client
      .from('object_templates')
      .update({
        name: input.name,
        category: input.category,
        description: input.description,
        tags: input.tags,
        scene_json_fragment: input.sceneJsonFragment,
        is_public: input.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !updated) {
      if (
        typeof updateError === 'object' &&
        updateError !== null &&
        'code' in updateError &&
        updateError.code === '23505'
      ) {
        throw new ConflictException(
          'An object template with this name already exists.',
        );
      }

      throw new NotFoundException('Object template not found.');
    }

    const row = updated as TemplateRow;

    try {
      await this.upsertTemplateEmbedding(row.id, input);
    } catch {
      throw new InternalServerErrorException(
        'Template updated but vector embedding failed. Try again.',
      );
    }

    return this.mapTemplateResponse(row, true);
  }

  async deleteObjectTemplate(id: string): Promise<{ deleted: true; id: string }> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .delete()
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      throw new NotFoundException('Object template not found.');
    }

    return { deleted: true, id };
  }

  private async upsertTemplateEmbedding(
    templateId: string,
    input: CreateObjectTemplateRequest | UpdateObjectTemplateRequest,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const embeddingText = [
      input.name,
      input.category,
      input.description,
      input.tags.join(' '),
      input.semanticKeywords.join(' '),
      input.aiPromptSeed ?? '',
    ]
      .filter(Boolean)
      .join(' ');
    const embedding = await this.embeddingsProvider.embedText(embeddingText);

    const { error: embeddingError } = await client
      .from('template_embeddings')
      .upsert({
        template_id: templateId,
        embedding: `[${embedding.join(',')}]`,
      });

    if (embeddingError) {
      throw embeddingError;
    }
  }

  private mapTemplateResponse(
    row: TemplateRow,
    hasEmbedding: boolean,
  ): ObjectTemplateResponse {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      tags: row.tags ?? [],
      sceneJsonFragment: row.scene_json_fragment,
      isPublic: row.is_public,
      hasEmbedding,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async searchObjectTemplates(
    query: string,
    limit = 8,
  ): Promise<ObjectTemplateSearchResult[]> {
    const [matches, catalog] = await Promise.all([
      this.searchPublicTemplates(query, limit),
      this.listObjectTemplates(),
    ]);

    return matches.map((match) => {
      const full = catalog.find((item) => item.id === match.id);

      return {
        ...(full ?? {
          id: match.id,
          name: match.name,
          category: match.category,
          description: match.description,
          tags: match.tags,
          sceneJsonFragment: match.fragment,
          isPublic: true,
          hasEmbedding: match.score > 0,
          createdAt: '',
          updatedAt: '',
        }),
        score: match.score,
      };
    });
  }

  async searchPublicTemplates(
    query: string,
    limit = 4,
  ): Promise<TemplateSearchResult[]> {
    const queryEmbedding = await this.embeddingsProvider.embedText(query);
    const semanticMatches = await this.searchWithPgVector(
      queryEmbedding,
      limit,
    );

    if (semanticMatches.length > 0) {
      return semanticMatches;
    }

    return this.searchWithKeywords(query, limit);
  }

  private async searchWithPgVector(
    queryEmbedding: number[],
    limit: number,
  ): Promise<TemplateSearchResult[]> {
    const client = this.supabaseService.getClient();
    const response = (await client.rpc('match_object_templates', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_count: limit,
    })) as SupabaseRpcResponse;
    const data = response.data;
    const error = response.error;

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data
      .map((row) =>
        this.mapTemplateRow(row as TemplateRow & { score?: number }),
      )
      .filter((template): template is TemplateSearchResult => Boolean(template))
      .slice(0, limit);
  }

  private async searchWithKeywords(
    query: string,
    limit: number,
  ): Promise<TemplateSearchResult[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .select('*')
      .eq('is_public', true)
      .limit(50);

    if (error || !Array.isArray(data)) {
      return [];
    }

    const queryTokens = this.tokenize(query);

    return data
      .map((row) => this.mapTemplateRow(row as TemplateRow))
      .filter((template): template is TemplateSearchResult => Boolean(template))
      .map((template) => ({
        ...template,
        score: this.keywordScore(queryTokens, template),
      }))
      .filter((template) => template.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit);
  }

  private mapTemplateRow(
    row: TemplateRow & { score?: number },
  ): TemplateSearchResult | undefined {
    const fragment = SceneFragmentSchema.safeParse(row.scene_json_fragment);

    if (!fragment.success) {
      return undefined;
    }

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      tags: row.tags ?? [],
      fragment: fragment.data,
      score: row.score ?? 0,
    };
  }

  private keywordScore(tokens: string[], template: ObjectTemplate): number {
    const haystack = this.tokenize(
      `${template.name} ${template.category} ${template.description} ${template.tags.join(' ')}`,
    );
    const haystackSet = new Set(haystack);

    return tokens.reduce(
      (score, token) => score + (haystackSet.has(token) ? 1 : 0),
      0,
    );
  }

  private tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
  }
}
