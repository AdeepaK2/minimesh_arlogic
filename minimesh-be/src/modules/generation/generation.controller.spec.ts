import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import type { SceneDocument } from '../../schemas/scene.schema';
import { GenerationController } from './generation.controller';
import {
  GenerateSceneResult,
  GenerationClarificationResult,
  GenerationService,
} from './generation.service';
import { GenerationJobsService } from './generation-jobs.service';
import type { GenerationJobResponse } from './generation-job.types';
import { BillingService } from '../billing/billing.service';
import { GltfBuilderService } from './gltf-builder.service';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';

function mockReq(): AuthenticatedRequest {
  return {
    authUser: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      accessToken: 'test-token',
    },
  } as AuthenticatedRequest;
}

const controllerScene: SceneDocument = {
  sceneName: 'Controller Scene',
  objects: [
    {
      id: 'object-1',
      name: 'Box',
      type: 'box',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: '#22c55e',
      },
    },
  ],
  lights: [],
  camera: {
    position: [5, 4, 7],
    target: [0, 0, 0],
    fov: 45,
  },
};

describe('GenerationController', () => {
  let controller: GenerationController;
  let service: jest.Mocked<
    Pick<
      GenerationService,
      'clarifyScenePrompt' | 'generateScene' | 'editScene' | 'refineEntity'
    >
  >;
  let jobsService: jest.Mocked<Pick<GenerationJobsService, 'createJob' | 'getJob'>>;

  beforeEach(async () => {
    service = {
      clarifyScenePrompt: jest.fn<
        GenerationClarificationResult,
        Parameters<GenerationService['clarifyScenePrompt']>
      >((prompt) => ({
        status: 'ready',
        resolvedPrompt: prompt,
      })),
      generateScene: jest.fn<
        Promise<GenerateSceneResult>,
        Parameters<GenerationService['generateScene']>
      >(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: [],
        }),
      ),
      editScene: jest.fn<
        Promise<GenerateSceneResult>,
        Parameters<GenerationService['editScene']>
      >(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: ['Edited scene from chat.'],
        }),
      ),
      refineEntity: jest.fn<
        Promise<GenerateSceneResult>,
        Parameters<GenerationService['refineEntity']>
      >(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: ['Refined selected entity.'],
        }),
      ),
    };
    jobsService = {
      createJob: jest.fn<GenerationJobResponse, Parameters<GenerationJobsService['createJob']>>(
        (request) => ({
          jobId: 'job-1',
          action: request.action,
          status: 'queued',
          steps: [],
          createdAt: '2026-05-16T00:00:00.000Z',
          updatedAt: '2026-05-16T00:00:00.000Z',
        }),
      ),
      getJob: jest.fn<
        GenerationJobResponse | undefined,
        Parameters<GenerationJobsService['getJob']>
      >(() => ({
        jobId: 'job-1',
        action: 'generate',
        status: 'succeeded',
        steps: [],
        result: {
          scene: controllerScene,
          warnings: [],
          review: {
            selectedCandidate: 'candidateA',
            candidateCount: 1,
            scores: [],
          },
        },
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [
        {
          provide: GenerationService,
          useValue: service,
        },
        {
          provide: GenerationJobsService,
          useValue: jobsService,
        },
        {
          provide: GltfBuilderService,
          useValue: {
            build: jest.fn(),
          },
        },
        {
          provide: BillingService,
          useValue: {
            assertQuotaAvailable: jest.fn().mockResolvedValue(undefined),
            recordGenerationUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<GenerationController>(GenerationController);
  });

  it('passes a valid prompt to the clarification service', () => {
    const result = controller.clarifyScene({
      prompt: 'generate a cricket bat with ball and 3 wickets',
    });

    expect(result).toEqual({
      status: 'ready',
      resolvedPrompt: 'generate a cricket bat with ball and 3 wickets',
    });
    expect(service.clarifyScenePrompt).toHaveBeenCalledWith(
      'generate a cricket bat with ball and 3 wickets',
    );
  });

  it('rejects an invalid clarification prompt', () => {
    expect(() => controller.clarifyScene({ prompt: '' })).toThrow(
      BadRequestException,
    );
  });

  it('passes a valid prompt to the generation service', async () => {
    await controller.generateScene(mockReq(), { prompt: 'make a small green box' });

    expect(service.generateScene).toHaveBeenCalledWith(
      'make a small green box',
      undefined,
    );
  });

  it('rejects an empty prompt', async () => {
    await expect(
      controller.generateScene(mockReq(), { prompt: '' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes a valid scene edit request to the generation service', async () => {
    await controller.editScene(mockReq(), {
      scene: controllerScene,
      instruction: 'add a glowing arch',
    });

    expect(service.editScene).toHaveBeenCalledWith(
      controllerScene,
      'add a glowing arch',
      undefined,
    );
  });

  it('rejects an invalid scene edit instruction', async () => {
    await expect(
      controller.editScene(mockReq(), {
        scene: controllerScene,
        instruction: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes a valid entity refinement request to the generation service', async () => {
    await controller.refineEntity(mockReq(), {
      scene: controllerScene,
      entityId: 'object-1',
      instruction: 'make it taller',
    });

    expect(service.refineEntity).toHaveBeenCalledWith(
      controllerScene,
      'object-1',
      'make it taller',
      undefined,
    );
  });

  it('creates a generation job', () => {
    const result = controller.createJob({
      action: 'generate',
      prompt: 'make a small green box',
    });

    expect(result).toMatchObject({
      jobId: 'job-1',
      action: 'generate',
      status: 'queued',
    });
    expect(jobsService.createJob).toHaveBeenCalledWith({
      action: 'generate',
      prompt: 'make a small green box',
    });
  });

  it('returns a generation job status', () => {
    const result = controller.getJob('job-1');

    expect(result.status).toBe('succeeded');
    expect(jobsService.getJob).toHaveBeenCalledWith('job-1');
  });
});
