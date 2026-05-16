import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HashEmbeddingsService } from './hash-embeddings.service';
import { OpenAiEmbeddingsService } from './openai-embeddings.service';
import { EMBEDDINGS_PROVIDER } from './embeddings.types';
import type { EmbeddingsProvider } from './embeddings.types';

@Module({
  providers: [
    HashEmbeddingsService,
    OpenAiEmbeddingsService,
    {
      provide: EMBEDDINGS_PROVIDER,
      inject: [ConfigService, HashEmbeddingsService, OpenAiEmbeddingsService],
      useFactory: (
        config: ConfigService,
        hash: HashEmbeddingsService,
        openai: OpenAiEmbeddingsService,
      ): EmbeddingsProvider => {
        const hasKey = Boolean(config.get<string>('OPENAI_API_KEY'));
        return hasKey ? openai : hash;
      },
    },
  ],
  exports: [EMBEDDINGS_PROVIDER],
})
export class EmbeddingsModule {}
