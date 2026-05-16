import { BadGatewayException } from '@nestjs/common';
import {
  MiniMaxChatRequest,
  MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
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
    expect(result.scene.objects[0].type).toBe('sphere');
    expect(result.scene.lights.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
    expect(provider.complete.mock.calls[0][0]).toMatchObject({
      maxCompletionTokens: 3000,
      temperature: 0.25,
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
