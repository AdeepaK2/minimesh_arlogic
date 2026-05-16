import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase/supabase.module';
import { ProjectsModule } from '../projects/projects.module';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';

@Module({
  imports: [SupabaseModule, ProjectsModule],
  controllers: [ScenesController],
  providers: [ScenesService],
})
export class ScenesModule {}
