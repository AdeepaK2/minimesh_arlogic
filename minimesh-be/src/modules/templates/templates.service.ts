import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../../ai/embeddings/embeddings.types';
import { SceneFragmentSchema } from '../../schemas/scene-fragment.schema';
import { SceneDocumentSchema } from '../../schemas/scene.schema';
import type { SceneDocument } from '../../schemas/scene.schema';
import type { ApprovedReferenceRequest } from './dto/approved-reference.dto';
import type {
  ApprovedReference,
  ApprovedReferenceSearchResult,
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

  async searchPublicTemplates(
    query: string,
    limit = 4,
  ): Promise<TemplateSearchResult[]> {
    const queryEmbedding = await this.embeddingsProvider.embedText(query);
    const semanticMatches = (
      await this.searchWithPgVector(queryEmbedding, Math.max(limit * 2, limit))
    )
      .filter((template) => template.referenceType === 'fragment')
      .slice(0, limit);

    if (semanticMatches.length > 0) {
      return semanticMatches;
    }

    return this.searchWithKeywords(query, limit, true);
  }

  async approveReference(
    userId: string,
    request: ApprovedReferenceRequest,
  ): Promise<ApprovedReference> {
    const fragment =
      request.referenceType === 'scene'
        ? this.fragmentFromScene(request.scene as SceneDocument)
        : SceneFragmentSchema.parse(request.fragment);
    const scene =
      request.referenceType === 'scene'
        ? SceneDocumentSchema.parse(request.scene)
        : undefined;
    const embedding = await this.embeddingsProvider.embedText(
      this.referenceEmbeddingText({
        name: request.name,
        category: request.category,
        description: request.description,
        tags: request.tags,
        fragment,
        scene,
      }),
    );
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .upsert(
        {
          name: request.name,
          category: request.category,
          description: request.description,
          tags: request.tags,
          scene_json_fragment: fragment,
          scene_json_document: scene ?? null,
          reference_type: request.referenceType,
          is_public: true,
          source_scene_id: request.sourceSceneId ?? null,
          source_version_id: request.sourceVersionId ?? null,
          source_user_id: userId,
          approved_by: userId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name' },
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new BadGatewayException({
        message: 'Approved reference could not be saved.',
      });
    }

    const saved = this.mapApprovedReferenceRow(data as TemplateRow & {
      approved_at?: string | null;
    });

    if (!saved) {
      throw new BadGatewayException({
        message: 'Approved reference was saved but could not be validated.',
      });
    }

    const embeddingResult = await client.from('template_embeddings').upsert(
      {
        template_id: saved.id,
        embedding: `[${embedding.join(',')}]`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_id' },
    );

    if (embeddingResult.error) {
      throw new BadGatewayException({
        message: 'Approved reference embedding could not be saved.',
      });
    }

    return saved;
  }

  async searchApprovedReferences(
    query: string,
    limit = 4,
  ): Promise<ApprovedReferenceSearchResult[]> {
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      const queryEmbedding =
        await this.embeddingsProvider.embedText(trimmedQuery);

      const vectorMatches = (await this.searchWithPgVector(queryEmbedding, limit))
        .map((template) => this.asApprovedSearchResult(template))
        .filter(
          (template): template is ApprovedReferenceSearchResult =>
            Boolean(template),
        );

      if (vectorMatches.length > 0) {
        return vectorMatches;
      }

      // Fallback: keyword search across approved templates when the vector index
      // is empty or returns no results (e.g. sparse early-stage database).
      const keywordMatches = await this.searchWithKeywords(trimmedQuery, limit);
      return keywordMatches
        .filter((t) => t.score > 0)
        .map((t) => this.asApprovedSearchResult(t))
        .filter((t): t is ApprovedReferenceSearchResult => Boolean(t));
    }

    return this.listLatestApprovedReferences(limit);
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
    fragmentOnly = false,
  ): Promise<TemplateSearchResult[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .select('*')
      .eq('is_public', true)
      .limit(80);

    if (error || !Array.isArray(data)) {
      return [];
    }

    const queryTokens = this.tokenize(query);

    return data
      .map((row) => this.mapTemplateRow(row as TemplateRow))
      .filter((template): template is TemplateSearchResult => Boolean(template))
      .filter((template) =>
        fragmentOnly ? template.referenceType === 'fragment' : true,
      )
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
    const scene =
      row.scene_json_document === undefined || row.scene_json_document === null
        ? undefined
        : SceneDocumentSchema.safeParse(row.scene_json_document);

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
      referenceType: row.reference_type ?? 'fragment',
      scene: scene?.success ? scene.data : undefined,
      score: row.score ?? 0,
    };
  }

  private mapApprovedReferenceRow(
    row: TemplateRow & { approved_at?: string | null },
  ): ApprovedReference | undefined {
    const template = this.mapTemplateRow(row);

    if (!template) {
      return undefined;
    }

    return {
      ...template,
      approvedAt: row.approved_at ?? null,
    };
  }

  private async listLatestApprovedReferences(
    limit: number,
  ): Promise<ApprovedReferenceSearchResult[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('object_templates')
      .select('*')
      .eq('is_public', true)
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data
      .map((row) =>
        this.mapApprovedReferenceRow(row as TemplateRow & {
          approved_at?: string | null;
        }),
      )
      .filter((template): template is ApprovedReference => Boolean(template))
      .map((template) => ({
        ...template,
        score: 0,
      }));
  }

  private asApprovedSearchResult(
    template: TemplateSearchResult,
  ): ApprovedReferenceSearchResult | undefined {
    if (!template) {
      return undefined;
    }

    return {
      ...template,
      score: template.score,
    };
  }

  private fragmentFromScene(scene: SceneDocument) {
    return SceneFragmentSchema.parse({
      objects: scene.objects.slice(0, 24),
      lights: scene.lights.slice(0, 4),
    });
  }

  private referenceEmbeddingText(reference: {
    name: string;
    category: string;
    description: string;
    tags: string[];
    fragment: unknown;
    scene?: SceneDocument;
  }): string {
    return [
      reference.name,
      reference.category,
      reference.description,
      reference.tags.join(' '),
      reference.scene?.sceneName,
      reference.scene?.description,
      JSON.stringify(reference.fragment),
    ]
      .filter(Boolean)
      .join('\n');
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
