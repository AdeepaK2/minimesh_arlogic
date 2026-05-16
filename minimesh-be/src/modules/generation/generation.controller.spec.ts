import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import type { SceneDocument } from '../../schemas/scene.schema';
import { GenerationController } from './generation.controller';
import { GenerateSceneResult, GenerationService } from './generation.service';

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
    Pick<GenerationService, 'generateScene' | 'editScene' | 'refineEntity'>
  >;

  beforeEach(async () => {
    service = {
      generateScene: jest.fn<Promise<GenerateSceneResult>, [string]>(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: [],
        }),
      ),
      editScene: jest.fn<
        Promise<GenerateSceneResult>,
        [SceneDocument, string]
      >(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: ['Edited scene from chat.'],
        }),
      ),
      refineEntity: jest.fn<
        Promise<GenerateSceneResult>,
        [SceneDocument, string, string]
      >(() =>
        Promise.resolve({
          scene: controllerScene,
          warnings: ['Refined selected entity.'],
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [
        {
          provide: GenerationService,
          useValue: service,
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

  it('passes a valid prompt to the generation service', async () => {
    await controller.generateScene({ prompt: 'make a small green box' });

    expect(service.generateScene).toHaveBeenCalledWith(
      'make a small green box',
    );
  });

  it('rejects an empty prompt', () => {
    expect(() => controller.generateScene({ prompt: '' })).toThrow(
      BadRequestException,
    );
  });

  it('passes a valid scene edit request to the generation service', async () => {
    await controller.editScene({
      scene: controllerScene,
      instruction: 'add a glowing arch',
    });

    expect(service.editScene).toHaveBeenCalledWith(
      controllerScene,
      'add a glowing arch',
    );
  });

  it('rejects an invalid scene edit instruction', () => {
    expect(() =>
      controller.editScene({
        scene: controllerScene,
        instruction: '',
      }),
    ).toThrow(BadRequestException);
  });

  it('passes a valid entity refinement request to the generation service', async () => {
    await controller.refineEntity({
      scene: controllerScene,
      entityId: 'object-1',
      instruction: 'make it taller',
    });

    expect(service.refineEntity).toHaveBeenCalledWith(
      controllerScene,
      'object-1',
      'make it taller',
    );
  });
});
