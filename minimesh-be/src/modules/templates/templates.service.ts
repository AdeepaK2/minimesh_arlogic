import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../../ai/embeddings/embeddings.types';
import { SceneFragmentSchema } from '../../schemas/scene-fragment.schema';
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
