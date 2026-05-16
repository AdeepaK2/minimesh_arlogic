import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../../ai/embeddings/embeddings.module';
import { SupabaseModule } from '../../database/supabase/supabase.module';
import { TemplatesService } from './templates.service';

@Module({
  imports: [EmbeddingsModule, SupabaseModule],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
