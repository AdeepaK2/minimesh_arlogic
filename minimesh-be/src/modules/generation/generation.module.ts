import { Module } from '@nestjs/common';
import { MiniMaxModule } from '../../ai/minimax/minimax.module';
import { SupabaseModule } from '../../database/supabase/supabase.module';
import { TemplatesModule } from '../templates/templates.module';
import { GenerationController } from './generation.controller';
import { GenerationPlannerService } from './generation-planner.service';
import { GenerationService } from './generation.service';
import { LightingAgentService } from './lighting-agent.service';
import { PartGenerationService } from './part-generation.service';
import { SceneAssemblyService } from './scene-assembly.service';

@Module({
  imports: [MiniMaxModule, SupabaseModule, TemplatesModule],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    GenerationPlannerService,
    LightingAgentService,
    PartGenerationService,
    SceneAssemblyService,
  ],
})
export class GenerationModule {}
