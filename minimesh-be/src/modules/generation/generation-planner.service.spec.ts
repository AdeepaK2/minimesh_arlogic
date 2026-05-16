import {
  MiniMaxChatRequest,
  MiniMaxTextProvider,
} from '../../ai/minimax/minimax.types';
import { GenerationPlannerService } from './generation-planner.service';

describe('GenerationPlannerService', () => {
  it('returns a valid strict scene plan from model JSON', async () => {
    const provider = createProvider([
      JSON.stringify({
        sceneName: 'Cyberpunk Street',
        description: 'A neon street with a hover car.',
        styleKeywords: ['cyberpunk', 'low-poly'],
        cameraIntent: 'cinematic angle focused on car',
        lightingIntent: 'blue and pink neon',
        maxObjectBudget: 36,
        entityGroups: [
          {
            id: 'vehicle',
            label: 'Hovering sports car',
            query: 'hovering sports car',
            priority: 10,
          },
        ],
      }),
    ]);
    const service = new GenerationPlannerService(provider);

    const plan = await service.createPlan('make a cyberpunk hover car street');

    expect(plan.sceneName).toBe('Cyberpunk Street');
    expect(plan.entityGroups[0]).toMatchObject({
      id: 'vehicle',
      query: 'hovering sports car',
    });
  });

  it('uses a heuristic plan when planner JSON is invalid', async () => {
    const provider = createProvider(['not json']);
    const service = new GenerationPlannerService(provider);

    const plan = await service.createPlan(
      'Create a cyberpunk street with buildings, neon signs, and crates.',
    );

    expect(plan.entityGroups.length).toBeGreaterThan(0);
    expect(plan.maxObjectBudget).toBe(36);
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
