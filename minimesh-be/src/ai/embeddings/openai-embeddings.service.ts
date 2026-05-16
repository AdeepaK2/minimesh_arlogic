import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { EmbeddingsProvider } from './embeddings.types';
import { HashEmbeddingsService } from './hash-embeddings.service';

const MODEL = 'text-embedding-3-small';
// 1536 is the full dimension for text-embedding-3-small; 512 is a compressed
// variant that still outperforms ada-002 while keeping the pgvector index small.
const DIMENSIONS = 512;

@Injectable()
export class OpenAiEmbeddingsService implements EmbeddingsProvider {
  private readonly client: OpenAI | null;
  private readonly logger = new Logger(OpenAiEmbeddingsService.name);
  /** Once a quota/auth error is seen we skip OpenAI for the rest of this process. */
  private quotaExceeded = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly hashEmbeddings: HashEmbeddingsService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.client = apiKey ? new OpenAI({ apiKey }) : null;

    if (!this.client) {
      this.logger.warn(
        'OPENAI_API_KEY is not set — OpenAI embeddings are disabled; hash fallback is used when selected.',
      );
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.client || this.quotaExceeded) {
      return this.hashEmbeddings.embedText(text);
    }

    try {
      const response = await this.client.embeddings.create({
        model: MODEL,
        input: text.slice(0, 8000),
        dimensions: DIMENSIONS,
      });
      return response.data[0].embedding;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 429 || status === 401 || status === 403) {
        this.quotaExceeded = true;
        this.logger.warn(
          `[OpenAiEmbeddings] ${status} — quota/auth error, falling back to hash embeddings for this session.`,
        );
        return this.hashEmbeddings.embedText(text);
      }
      this.logger.error('[OpenAiEmbeddings] embedText failed', err);
      throw err;
    }
  }
}
