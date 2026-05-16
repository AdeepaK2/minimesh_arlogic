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

  it('stores approved references with embeddings', async () => {
    const upsertObject = jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() =>
          Promise.resolve({
            error: null,
            data: {
              id: 'template-1',
              name: 'Approved Wicket',
              category: 'sport',
              description: 'Reusable cricket wicket model.',
              tags: ['cricket', 'wicket'],
              scene_json_fragment: {
                objects: [
                  {
                    id: 'stump',
                    name: 'Stump',
                    type: 'cylinder',
                    position: [0, 1, 0],
                    rotation: [0, 0, 0],
                    scale: [0.08, 1, 0.08],
                    material: { color: '#8b5a2b' },
                  },
                ],
                lights: [],
              },
              reference_type: 'fragment',
              scene_json_document: null,
              is_public: true,
              created_at: '',
              updated_at: '',
              approved_at: '2026-05-16T00:00:00.000Z',
            },
          }),
        ),
      })),
    }));
    const upsertEmbedding = jest.fn(() => Promise.resolve({ error: null }));
    const client = {
      from: jest.fn((table: string) => ({
        upsert: table === 'object_templates' ? upsertObject : upsertEmbedding,
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

    const result = await service.approveReference('user-1', {
      referenceType: 'fragment',
      name: 'Approved Wicket',
      category: 'sport',
      description: 'Reusable cricket wicket model.',
      tags: ['cricket', 'wicket'],
      fragment: {
        objects: [
          {
            id: 'stump',
            name: 'Stump',
            type: 'cylinder',
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            scale: [0.08, 1, 0.08],
            material: { color: '#8b5a2b' },
          },
        ],
        lights: [],
      },
    });

    expect(result.name).toBe('Approved Wicket');
    expect(embeddingsProvider.embedText).toHaveBeenCalledWith(
      expect.stringContaining('Reusable cricket wicket model.'),
    );
    expect(upsertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({
        template_id: 'template-1',
        embedding: '[1,0,0]',
      }),
      { onConflict: 'template_id' },
    );
  });
});
