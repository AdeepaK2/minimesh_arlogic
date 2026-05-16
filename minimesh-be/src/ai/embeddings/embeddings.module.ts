import { Module } from '@nestjs/common';
import { HashEmbeddingsService } from './hash-embeddings.service';
import { EMBEDDINGS_PROVIDER } from './embeddings.types';

@Module({
  providers: [
    HashEmbeddingsService,
    {
      provide: EMBEDDINGS_PROVIDER,
      useExisting: HashEmbeddingsService,
    },
  ],
  exports: [EMBEDDINGS_PROVIDER],
})
export class EmbeddingsModule {}
