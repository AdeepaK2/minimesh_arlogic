import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../../ai/embeddings/embeddings.types';

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  scene_json_fragment: unknown;
  scene_json_document: unknown;
}

/**
 * On startup, finds any object_templates rows that are missing from
 * template_embeddings and generates + stores their embeddings.
 * This "bootstraps" the vector index so pgvector returns results even
 * when the database is freshly seeded with template rows but no embeddings.
 */
@Injectable()
export class TemplatesSeedService implements OnModuleInit {
  private readonly logger = new Logger(TemplatesSeedService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(EMBEDDINGS_PROVIDER)
    private readonly embeddingsProvider: EmbeddingsProvider,
  ) {}

  async onModuleInit() {
    try {
      await this.backfillMissingEmbeddings();
    } catch (err) {
      // Non-fatal: the app still starts, just without seeded embeddings.
      this.logger.warn('[TemplatesSeed] backfill failed (non-fatal)', err);
    }
  }

  private async backfillMissingEmbeddings(): Promise<void> {
    const client = this.supabaseService.getClient();

    // Load all public templates and all existing embedding IDs in parallel
    const [templatesResult, embeddingIdsResult] = await Promise.all([
      client.from('object_templates').select('*').eq('is_public', true),
      client.from('template_embeddings').select('template_id'),
    ]);

    if (templatesResult.error || !Array.isArray(templatesResult.data)) return;
    if (embeddingIdsResult.error) return;

    const existingIds = new Set(
      (embeddingIdsResult.data as { template_id: string }[]).map(
        (r) => r.template_id,
      ),
    );

    const missing = (templatesResult.data as TemplateRow[]).filter(
      (t) => !existingIds.has(t.id),
    );

    if (missing.length === 0) return;

    this.logger.log(`[TemplatesSeed] Seeding embeddings for ${missing.length} template(s)…`);

    for (const template of missing) {
      try {
        const text = this.embeddingText(template);
        const embedding = await this.embeddingsProvider.embedText(text);

        await client.from('template_embeddings').upsert(
          {
            template_id: template.id,
            embedding: `[${embedding.join(',')}]`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'template_id' },
        );

        this.logger.log(`[TemplatesSeed] ✓ ${template.name}`);
      } catch (err) {
        this.logger.warn(`[TemplatesSeed] ✗ ${template.name}: ${String(err)}`);
      }
    }

    this.logger.log('[TemplatesSeed] Embedding backfill complete.');
  }

  private embeddingText(t: TemplateRow): string {
    return [
      t.name,
      t.category,
      t.description,
      (t.tags ?? []).join(' '),
      JSON.stringify(t.scene_json_fragment ?? ''),
    ]
      .filter(Boolean)
      .join('\n');
  }
}
