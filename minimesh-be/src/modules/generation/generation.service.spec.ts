import { BadGatewayException } from '@nestjs/common';
import {
  MiniMaxChatRequest,
  MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import type { SceneDocument } from '../../schemas/scene.schema';
import { GenerationService } from './generation.service';

const validSceneJson = JSON.stringify({
  sceneName: 'Prompt Scene',
  objects: [
    {
      id: 'object-1',
      name: 'Red sphere',
      type: 'sphere',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: '#ef4444',
      },
    },
  ],
});

describe('GenerationService', () => {
  it('returns validated scene JSON from MiniMax output', async () => {
    const provider = createProvider([validSceneJson]);
    const service = new GenerationService(provider);

    const result = await service.generateScene('make a red sphere');

    expect(result.scene.sceneName).toBe('Prompt Scene');
    expect(result.scene.entities?.[0]).toMatchObject({
      id: 'object-1',
      objectIds: ['object-1'],
    });
    expect(result.scene.objects[0].type).toBe('sphere');
    expect(result.scene.lights.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
    expect(provider.complete.mock.calls[0][0]).toMatchObject({
      maxCompletionTokens: 5000,
      temperature: 0.25,
    });
  });

  it('normalizes common rich-scene model drift into valid primitives', () => {
    const provider = createProvider([]);
    const service = new GenerationService(provider);
    const result = service.parseAndValidate(
      JSON.stringify({
        sceneName: 'Cyberpunk Street',
        objects: [
          {
            id: 'hovering car',
            name: 'Hovering sports car',
            type: 'car',
            position: ['0', 1, 0],
            rotation: [0, 0, 0],
            scale: [-2, 0.4, 1],
            material: { color: 'neonPink', emissive: '#ff00ff' },
          },
          {
            id: 'billboard',
            name: 'Holographic billboard',
            type: 'billboard',
            position: [0, 3, -2],
            rotation: [0, 0, 0],
            scale: [2, 1, 0.1],
            material: { color: 'purple' },
          },
        ],
        lights: [
          {
            id: 'neon glow',
            type: 'spot',
            color: 'cyan',
            intensity: '3',
            position: [1, 4, 2],
          },
        ],
        camera: { position: [5, 3, 6], target: [0, 1, 0], fov: '50' },
      }),
    );

    expect(result.errors).toEqual([]);
    expect(result.scene?.objects[0]).toMatchObject({
      id: 'hovering-car',
      type: 'box',
      material: { color: '#ff2bd6' },
      scale: [2, 0.4, 1],
    });
    expect(result.scene?.objects[1].type).toBe('plane');
    expect(result.scene?.lights?.[0]).toMatchObject({
      type: 'point',
      color: '#22d3ee',
      intensity: 3,
    });
  });

  it('extracts JSON from fenced or noisy output', () => {
    const provider = createProvider([]);
    const service = new GenerationService(provider);
    const result = service.parseAndValidate(
      `Here is the JSON:\n\`\`\`json\n${validSceneJson}\n\`\`\``,
    );

    expect(result.scene?.objects[0].name).toBe('Red sphere');
    expect(result.errors).toEqual([]);
  });

  it('repairs malformed JSON with one retry', async () => {
    const provider = createProvider(['not json', validSceneJson]);
    const service = new GenerationService(provider);

    const result = await service.generateScene('make a red sphere');

    expect(provider.complete.mock.calls).toHaveLength(2);
    expect(result.warnings).toEqual([
      'Initial MiniMax output was repaired before validation.',
    ]);
  });

  it('throws when initial and repaired outputs are invalid', async () => {
    const provider = createProvider(['not json', '{"sceneName":"Broken"}']);
    const service = new GenerationService(provider);

    await expect(service.generateScene('make a scene')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('uses the part pipeline for complex prompts when pipeline services are available', async () => {
    const provider = createProvider([]);
    const plannerService = {
      shouldUsePipeline: jest.fn(() => true),
      createPlan: jest.fn(() =>
        Promise.resolve({
          sceneName: 'Cyberpunk Street',
          description: 'A rich neon street scene.',
          styleKeywords: ['cyberpunk'],
          cameraIntent: 'cinematic angle',
          lightingIntent: 'blue and pink neon lighting',
          maxObjectBudget: 36,
          entityGroups: [
            {
              id: 'vehicle',
              label: 'Hover car',
              query: 'hover car',
              priority: 10,
            },
          ],
        }),
      ),
    };
    const partGenerationService = {
      generateParts: jest.fn(() =>
        Promise.resolve([
          {
            groupId: 'vehicle',
            groupLabel: 'Hover car',
            source: 'template',
            fragment: {
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
          },
        ]),
      ),
    };
    const pipelineScene: SceneDocument = {
      sceneName: 'Prompt Scene',
      objects: [
        {
          id: 'object-1',
          name: 'Red sphere',
          type: 'sphere',
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: {
            color: '#ef4444',
          },
        },
      ],
      lights: [],
      camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
    };
    const sceneAssemblyService = {
      assemble: jest.fn(() => pipelineScene),
    };
    const lightingAgentService = {
      enhanceScene: jest.fn((_prompt, _plan, scene: SceneDocument) => ({
        ...scene,
        environment: {
          backgroundColor: '#07111f',
          fogColor: '#0f172a',
          fogNear: 14,
          fogFar: 54,
          exposure: 1.65,
        },
      })),
      enhanceIfNeeded: jest.fn((_prompt, scene: SceneDocument) => scene),
    };
    const service = new GenerationService(
      provider,
      plannerService as never,
      partGenerationService as never,
      sceneAssemblyService as never,
      lightingAgentService as never,
    );

    const result = await service.generateScene(
      'Create a futuristic cyberpunk street with a hovering sports car, neon signs, buildings, and lamps.',
    );

    expect(result.scene.sceneName).toBe('Prompt Scene');
    expect(result.scene.environment?.exposure).toBe(1.65);
    expect(result.warnings).toEqual([
      'Generated with template-assisted multi-part pipeline.',
    ]);
    expect(provider.complete.mock.calls).toHaveLength(0);
    expect(lightingAgentService.enhanceScene).toHaveBeenCalledTimes(1);
  });

  it('edits an existing scene with validated full scene JSON', async () => {
    const provider = createProvider([
      JSON.stringify({
        sceneName: 'Edited Scene',
        description: 'A revised scene.',
        objects: [
          {
            id: 'object-1',
            name: 'Tall red sphere',
            type: 'sphere',
            position: [0, 1.4, 0],
            rotation: [0, 0, 0],
            scale: [1, 1.8, 1],
            material: { color: '#ef4444' },
          },
        ],
        lights: [],
        camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
      }),
    ]);
    const service = new GenerationService(provider);
    const scene: SceneDocument = {
      sceneName: 'Original Scene',
      objects: [
        {
          id: 'object-1',
          name: 'Red sphere',
          type: 'sphere',
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: { color: '#ef4444' },
        },
      ],
      lights: [],
      camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
    };

    const result = await service.editScene(scene, 'make it taller');

    expect(result.scene.sceneName).toBe('Edited Scene');
    expect(result.scene.objects[0].name).toBe('Tall red sphere');
    expect(result.scene.objects[0].scale).toEqual([1, 1.8, 1]);
    expect(result.scene.entities?.[0].objectIds).toEqual(['object-1']);
    expect(result.warnings).toEqual(['Edited scene from chat.']);
    expect(provider.complete.mock.calls[0][0]).toMatchObject({
      maxCompletionTokens: 5200,
      temperature: 0.2,
    });
  });

  it('throws when edited scene JSON cannot be repaired', async () => {
    const provider = createProvider(['not json', '{"sceneName":"Broken"}']);
    const service = new GenerationService(provider);
    const scene: SceneDocument = {
      sceneName: 'Original Scene',
      objects: [
        {
          id: 'object-1',
          name: 'Red sphere',
          type: 'sphere',
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: { color: '#ef4444' },
        },
      ],
      lights: [],
      camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
    };

    await expect(service.editScene(scene, 'make it taller')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('refines only the selected entity objects', async () => {
    const provider = createProvider([
      JSON.stringify({
        objects: [
          {
            id: 'car-body',
            name: 'Longer car body',
            entityId: 'car',
            role: 'body',
            type: 'box',
            position: [0, 1, 0],
            rotation: [0, 0, 0],
            scale: [2, 0.4, 0.6],
            material: { color: '#ef4444' },
          },
        ],
        warnings: ['Updated selected entity only.'],
      }),
    ]);
    const service = new GenerationService(provider);
    const scene: SceneDocument = {
      sceneName: 'Entity Scene',
      objects: [
        {
          id: 'car-body',
          name: 'Car body',
          entityId: 'car',
          role: 'body',
          type: 'box',
          position: [0, 1, 0],
          rotation: [0, 0, 0],
          scale: [1, 0.4, 0.6],
          material: { color: '#111827' },
        },
        {
          id: 'road',
          name: 'Road',
          entityId: 'road',
          role: 'ground',
          type: 'plane',
          position: [0, 0, 0],
          rotation: [-1.57, 0, 0],
          scale: [6, 6, 1],
          material: { color: '#0f172a' },
        },
      ],
      entities: [
        {
          id: 'car',
          name: 'Car',
          objectIds: ['car-body'],
          tags: ['vehicle'],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
        {
          id: 'road',
          name: 'Road',
          objectIds: ['road'],
          tags: ['ground'],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
      ],
      lights: [],
      camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
    };

    const result = await service.refineEntity(scene, 'car', 'make it longer');

    expect(result.scene.objects[0].name).toBe('Longer car body');
    expect(result.scene.objects[0].scale).toEqual([2, 0.4, 0.6]);
    expect(result.scene.objects[1].name).toBe('Road');
    expect(result.warnings).toContain('Refined selected entity.');
  });
});

function createProvider(outputs: string[]): jest.Mocked<MiniMaxTextProvider> {
  return {
    complete: jest.fn<Promise<string>, [MiniMaxChatRequest]>(() => {
      const output = outputs.shift();

      if (!output) {
        return Promise.reject(new Error('No mocked MiniMax output available.'));
      }

      return Promise.resolve(output);
    }),
  };
}
