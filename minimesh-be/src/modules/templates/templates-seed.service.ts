import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase/supabase.service';
import {
  EMBEDDINGS_PROVIDER,
  type EmbeddingsProvider,
} from '../../ai/embeddings/embeddings.types';
import { APPROVED_SCENE_SEEDS } from './seeds/approved-scenes.seed';

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
 * Runs on startup:
 * 1. Seeds any entries from APPROVED_SCENE_SEEDS that are not yet in object_templates.
 * 2. Backfills template_embeddings for any object_templates rows that are missing them.
 *
 * Both steps are non-fatal — the app starts even if they fail.
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
      await this.seedApprovedScenes();
    } catch (err) {
      this.logger.warn('[TemplatesSeed] scene seed failed (non-fatal)', err);
    }

    try {
      await this.backfillMissingEmbeddings();
    } catch (err) {
      this.logger.warn('[TemplatesSeed] embedding backfill failed (non-fatal)', err);
    }
  }

  // ─── Step 1: seed approved scenes ────────────────────────────────────────

  private async seedApprovedScenes(): Promise<void> {
    const client = this.supabaseService.getClient();

    // Fetch existing template names to avoid duplicating
    const { data: existing } = await client
      .from('object_templates')
      .select('name')
      .eq('is_public', true);

    const existingNames = new Set(
      (existing ?? []).map((r: { name: string }) => r.name),
    );

    const toInsert = APPROVED_SCENE_SEEDS.filter(
      (s) => !existingNames.has(s.name),
    );

    if (toInsert.length === 0) return;

    this.logger.log(
      `[TemplatesSeed] Inserting ${toInsert.length} approved scene(s) into object_templates…`,
    );

    for (const seed of toInsert) {
      try {
        // Build a fragment (objects + lights subset) from the full scene
        const sceneObj = seed.scene as Record<string, unknown>;
        const fragment = {
          objects: ((sceneObj.objects as unknown[]) ?? []).slice(0, 24),
          lights: ((sceneObj.lights as unknown[]) ?? []).slice(0, 4),
        };

        const { data, error } = await client
          .from('object_templates')
          .insert({
            name: seed.name,
            category: seed.category,
            description: seed.description,
            tags: seed.tags,
            scene_json_fragment: fragment,
            scene_json_document: seed.scene,
            reference_type: 'scene',
            is_public: true,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error || !data) {
          this.logger.warn(`[TemplatesSeed] ✗ insert "${seed.name}": ${error?.message}`);
          continue;
        }

        // Generate and store the embedding immediately
        const embeddingText = [
          seed.name,
          seed.category,
          seed.description,
          seed.tags.join(' '),
          JSON.stringify(fragment),
        ].join('\n');

        const embedding = await this.embeddingsProvider.embedText(embeddingText);

        await client.from('template_embeddings').insert({
          template_id: (data as { id: string }).id,
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString(),
        });

        this.logger.log(`[TemplatesSeed] ✓ seeded "${seed.name}"`);
      } catch (err) {
        this.logger.warn(`[TemplatesSeed] ✗ "${seed.name}": ${String(err)}`);
      }
    }
  }

  // ─── Step 2: backfill embeddings for orphaned rows ───────────────────────

  private async backfillMissingEmbeddings(): Promise<void> {
    const client = this.supabaseService.getClient();

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

    this.logger.log(
      `[TemplatesSeed] Backfilling embeddings for ${missing.length} template(s)…`,
    );

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
