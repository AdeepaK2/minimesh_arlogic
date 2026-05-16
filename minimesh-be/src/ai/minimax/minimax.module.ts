import { Module } from '@nestjs/common';
import { MiniMaxService } from './minimax.service';
import { MINIMAX_TEXT_PROVIDER } from './minimax.types';

@Module({
  providers: [
    MiniMaxService,
    {
      provide: MINIMAX_TEXT_PROVIDER,
      useExisting: MiniMaxService,
    },
  ],
  exports: [MINIMAX_TEXT_PROVIDER],
})
export class MiniMaxModule {}
