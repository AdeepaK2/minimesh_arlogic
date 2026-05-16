import type { EmbeddingsProvider } from '../../ai/embeddings/embeddings.types';
import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  it('returns only valid curated template fragments from keyword fallback', async () => {
    const client = {
      rpc: jest.fn(() =>
        Promise.resolve({ data: null, error: { message: 'no rpc' } }),
      ),
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() =>
              Promise.resolve({
                error: null,
                data: [
                  {
                    id: 'template-1',
                    name: 'Hover Sports Car',
                    category: 'vehicle',
                    description: 'Cyberpunk hover car',
                    tags: ['hover', 'car', 'sports'],
                    scene_json_fragment: {
                      objects: [
                        {
                          id: 'car-body',
                          name: 'Car body',
                          type: 'box',
                          position: [0, 1, 0],
                          rotation: [0, 0, 0],
                          scale: [1, 0.4, 0.6],
                          material: { color: '#111827' },
                        },
                      ],
                      lights: [],
                    },
                    is_public: true,
                    created_at: '',
                    updated_at: '',
                  },
                  {
                    id: 'template-2',
                    name: 'Broken Template',
                    category: 'vehicle',
                    description: 'Invalid mesh output',
                    tags: ['hover', 'car'],
                    scene_json_fragment: {
                      objects: [
                        {
                          id: 'bad',
                          name: 'Bad mesh',
                          type: 'mesh',
                          position: [0, 0, 0],
                          rotation: [0, 0, 0],
                          scale: [1, 1, 1],
                          material: { color: '#ffffff' },
                        },
                      ],
                    },
                    is_public: true,
                    created_at: '',
                    updated_at: '',
                  },
                ],
              }),
            ),
          })),
        })),
      })),
    };
    const supabaseService = {
      getClient: () => client,
    };
    const embeddingsProvider: EmbeddingsProvider = {
      embedText: jest.fn(() => Promise.resolve([1, 0, 0])),
    };
    const service = new TemplatesService(
      supabaseService as never,
      embeddingsProvider,
    );

    const results = await service.searchPublicTemplates('hover sports car');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Hover Sports Car');
    expect(results[0].fragment.objects[0].type).toBe('box');
  });
});
