import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { EmbeddingsProvider } from './embeddings.types';

const MODEL = 'text-embedding-3-small';
// 1536 is the full dimension for text-embedding-3-small; 512 is a compressed
// variant that still outperforms ada-002 while keeping the pgvector index small.
const DIMENSIONS = 512;

@Injectable()
export class OpenAiEmbeddingsService implements EmbeddingsProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiEmbeddingsService.name);

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async embedText(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: MODEL,
        input: text.slice(0, 8000), // stay within token limit
        dimensions: DIMENSIONS,
      });
      return response.data[0].embedding;
    } catch (err) {
      this.logger.error('[OpenAiEmbeddings] embedText failed', err);
      throw err;
    }
  }
}
