import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import { ProjectsController } from './projects.controller';
import { ProjectResponse } from './projects.types';
import { ProjectsService } from './projects.service';

const project: ProjectResponse = {
  id: 'project-1',
  name: 'Demo Project',
  description: null,
  sceneCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: jest.Mocked<
    Pick<ProjectsService, 'createProject' | 'listProjects'>
  >;

  beforeEach(async () => {
    service = {
      createProject: jest.fn<Promise<ProjectResponse>, [string, never]>(() =>
        Promise.resolve(project),
      ),
      listProjects: jest.fn<Promise<ProjectResponse[]>, [string]>(() =>
        Promise.resolve([project]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('lists projects for the authenticated user', async () => {
    await controller.listProjects(createRequest('user-1'));

    expect(service.listProjects).toHaveBeenCalledWith('user-1');
  });

  it('creates a project for the authenticated user', async () => {
    await controller.createProject(createRequest('user-1'), {
      name: 'Demo Project',
    });

    expect(service.createProject).toHaveBeenCalledWith('user-1', {
      name: 'Demo Project',
    });
  });

  it('rejects an empty project name', () => {
    expect(() =>
      controller.createProject(createRequest('user-1'), { name: '' }),
    ).toThrow(BadRequestException);
  });
});

function createRequest(userId: string) {
  return {
    authUser: {
      id: userId,
      accessToken: 'token',
    },
  } as never;
}
