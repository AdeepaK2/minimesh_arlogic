export interface EmbeddingsProvider {
  embedText(text: string): Promise<number[]>;
}

export const EMBEDDINGS_PROVIDER = Symbol('EMBEDDINGS_PROVIDER');
