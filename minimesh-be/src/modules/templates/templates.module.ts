import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../../ai/embeddings/embeddings.module';
import { SupabaseModule } from '../../database/supabase/supabase.module';
import { AdminObjectTemplatesController } from './admin-object-templates.controller';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  imports: [EmbeddingsModule, SupabaseModule],
  controllers: [TemplatesController, AdminObjectTemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
