import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmbeddingsProvider } from './embeddings.types';

@Injectable()
export class HashEmbeddingsService implements EmbeddingsProvider {
  private readonly dimensions: number;

  constructor(private readonly configService: ConfigService) {
    this.dimensions = Number(
      this.configService.get<string>('EMBEDDING_DIMENSIONS') ?? 384,
    );
  }

  embedText(text: string): Promise<number[]> {
    const vector = Array.from({ length: this.dimensions }, () => 0);
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const token of tokens) {
      const index = Math.abs(this.hash(token)) % this.dimensions;
      vector[index] += 1;
    }

    const magnitude = Math.sqrt(
      vector.reduce((sum, value) => sum + value * value, 0),
    );

    if (magnitude === 0) {
      return Promise.resolve(vector);
    }

    return Promise.resolve(
      vector.map((value) => Number((value / magnitude).toFixed(6))),
    );
  }

  private hash(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return hash;
  }
}
