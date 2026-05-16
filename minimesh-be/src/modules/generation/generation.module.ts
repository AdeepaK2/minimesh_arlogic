import { Module } from '@nestjs/common';
import { MiniMaxModule } from '../../ai/minimax/minimax.module';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';

@Module({
  imports: [MiniMaxModule],
  controllers: [GenerationController],
  providers: [GenerationService],
})
export class GenerationModule {}
