import { Module } from '@nestjs/common';
import { MiniMaxModule } from '../../ai/minimax/minimax.module';
import { OpenAIModule } from '../../ai/openai/openai.module';
import { SupabaseModule } from '../../database/supabase/supabase.module';
import { TemplatesModule } from '../templates/templates.module';
import { GenerationController } from './generation.controller';
import { GenerationJobsService } from './generation-jobs.service';
import { GenerationPlannerService } from './generation-planner.service';
import { GenerationService } from './generation.service';
import { ContextBuilderService } from './context-builder.service';
import { ContextCompactionService } from './context-compaction.service';
import { LightingAgentService } from './lighting-agent.service';
import { PartGenerationService } from './part-generation.service';
import { ScaleAgentService } from './scale-agent.service';
import { SceneAssemblyService } from './scene-assembly.service';
import { TokenUsageService } from './token-usage.service';

@Module({
  imports: [MiniMaxModule, OpenAIModule, SupabaseModule, TemplatesModule],
  controllers: [GenerationController],
  providers: [
    GenerationService,
    GenerationJobsService,
    ContextBuilderService,
    ContextCompactionService,
    GenerationPlannerService,
    LightingAgentService,
    PartGenerationService,
    ScaleAgentService,
    SceneAssemblyService,
    TokenUsageService,
  ],
})
export class GenerationModule {}
