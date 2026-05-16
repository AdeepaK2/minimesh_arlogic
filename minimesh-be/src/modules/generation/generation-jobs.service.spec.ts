import type { MiniMaxTextProvider } from '../../ai/minimax/minimax.types';
import { OpenAIService } from '../../ai/openai/openai.service';
import type { SceneDocument } from '../../schemas/scene.schema';
import { GenerationService } from './generation.service';
import { GenerationJobsService } from './generation-jobs.service';

const baseScene: SceneDocument = {
  sceneName: 'Base Scene',
  objects: [
    {
      id: 'box',
      name: 'Box',
      type: 'box',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: { color: '#38bdf8' },
    },
  ],
  lights: [
    {
      id: 'ambient',
      type: 'ambient',
      color: '#ffffff',
      intensity: 0.5,
    },
  ],
  camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
};

describe('GenerationJobsService', () => {
  it('chooses the higher scoring candidate', async () => {
    const miniMaxProvider = createProvider();
    const openAIProvider = createOpenAIProvider();
    const generationService = createGenerationService((provider) =>
      Promise.resolve({
        scene:
          provider === openAIProvider
            ? {
                ...baseScene,
                sceneName: 'Green Racing Car',
                description: 'A green racing car on a road.',
                objects: [
                  {
                    ...baseScene.objects[0],
                    id: 'green-racing-car',
                    name: 'Green racing car',
                  },
                  {
                    ...baseScene.objects[0],
                    id: 'road',
                    name: 'Road',
                  },
                ],
              }
            : baseScene,
        warnings: [],
      }),
    );
    const service = new GenerationJobsService(
      generationService as unknown as GenerationService,
      miniMaxProvider,
      openAIProvider,
    );

    const created = service.createJob({
      action: 'generate',
      prompt: 'green racing car road',
    });
    const completed = await waitForJob(service, created.jobId);

    expect(completed.status).toBe('succeeded');
    expect(completed.result?.review.selectedCandidate).toBe('candidateB');
    expect(completed.result?.scene.sceneName).toBe('Green Racing Car');
  });

  it('returns the valid candidate when one provider fails', async () => {
    const miniMaxProvider = createProvider();
    const openAIProvider = createOpenAIProvider();
    const generationService = createGenerationService((provider) =>
      provider === miniMaxProvider
        ? Promise.reject(new Error('candidate failed'))
        : Promise.resolve({ scene: baseScene, warnings: [] }),
    );
    const service = new GenerationJobsService(
      generationService as unknown as GenerationService,
      miniMaxProvider,
      openAIProvider,
    );

    const created = service.createJob({
      action: 'generate',
      prompt: 'make a box',
    });
    const completed = await waitForJob(service, created.jobId);

    expect(completed.status).toBe('succeeded');
    expect(completed.result?.review.selectedCandidate).toBe('candidateB');
  });

  it('fails the job when all candidates fail', async () => {
    const service = new GenerationJobsService(
      createGenerationService(
        () => Promise.reject(new Error('no scene')),
      ) as unknown as GenerationService,
      createProvider(),
      createOpenAIProvider(),
    );

    const created = service.createJob({
      action: 'generate',
      prompt: 'make a box',
    });
    const completed = await waitForJob(service, created.jobId);

    expect(completed.status).toBe('failed');
    expect(completed.error).toContain('no scene');
  });
});

function createGenerationService(
  generateScene: (
    provider: MiniMaxTextProvider | undefined,
  ) => ReturnType<GenerationService['generateScene']>,
): jest.Mocked<Pick<GenerationService, 'generateScene' | 'editScene' | 'refineEntity'>> {
  return {
    generateScene: jest.fn((_prompt, _chatContext, provider) =>
      generateScene(provider),
    ),
    editScene: jest.fn((_scene, _instruction, _chatContext, provider) =>
      generateScene(provider),
    ),
    refineEntity: jest.fn(
      (_scene, _entityId, _instruction, _chatContext, provider) =>
        generateScene(provider),
    ),
  };
}

function createProvider(): MiniMaxTextProvider {
  return {
    complete: jest.fn(() => Promise.resolve('candidateA')),
  };
}

function createOpenAIProvider(): OpenAIService {
  return {
    isConfigured: jest.fn(() => true),
    complete: jest.fn(() => Promise.resolve('candidateB')),
    completeWithUsage: jest.fn(),
  } as unknown as OpenAIService;
}

async function waitForJob(
  service: GenerationJobsService,
  jobId: string,
): Promise<ReturnType<GenerationJobsService['getJob']> extends infer T
  ? NonNullable<T>
  : never> {
  for (let index = 0; index < 20; index += 1) {
    const job = service.getJob(jobId);

    if (job && (job.status === 'succeeded' || job.status === 'failed')) {
      return job as NonNullable<typeof job>;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error('Job did not finish.');
}
