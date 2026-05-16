import type { SceneDocument } from '../../schemas/scene.schema';
import type { ScenePlan } from './generation-plan.schema';
import { LightingAgentService } from './lighting-agent.service';

const darkCyberpunkScene: SceneDocument = {
  sceneName: 'Cyberpunk Night Street',
  description: 'A dark night scene with neon signs.',
  objects: [
    {
      id: 'dark-building',
      name: 'Dark building',
      type: 'box',
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: [1, 2, 1],
      material: { color: '#111827' },
    },
    {
      id: 'neon-sign',
      name: 'Neon sign',
      type: 'plane',
      position: [0, 2.2, 0.55],
      rotation: [0, 0, 0],
      scale: [1, 0.3, 1],
      material: { color: '#ff2bd6' },
    },
  ],
  lights: [],
  camera: {
    position: [5, 4, 7],
    target: [0, 0.5, 0],
    fov: 50,
  },
};

const plan: ScenePlan = {
  sceneName: 'Cyberpunk Night Street',
  description: 'A dark cyberpunk street.',
  styleKeywords: ['cyberpunk', 'low-poly'],
  cameraIntent: 'cinematic camera focused on the car',
  lightingIntent: 'blue purple and pink neon night lighting',
  maxObjectBudget: 36,
  entityGroups: [
    {
      id: 'signs',
      label: 'Neon signs',
      query: 'neon signs',
      priority: 8,
    },
  ],
};

describe('LightingAgentService', () => {
  it('adds readable cinematic lighting and environment for night scenes', () => {
    const service = new LightingAgentService();

    const scene = service.enhanceScene(
      'Create a cyberpunk street at night with neon lighting.',
      plan,
      darkCyberpunkScene,
    );

    expect(scene.lights.length).toBeGreaterThanOrEqual(3);
    expect(scene.lights.length).toBeLessThanOrEqual(8);
    expect(scene.lights.some((light) => light.type === 'ambient')).toBe(true);
    expect(scene.environment).toMatchObject({
      backgroundColor: '#07111f',
      exposure: 1.65,
    });
    expect(scene.objects[1].material).toMatchObject({
      emissive: '#ff2bd6',
      emissiveIntensity: 1.9,
    });
  });

  it('leaves bright simple scenes unchanged when no lighting pass is needed', () => {
    const service = new LightingAgentService();
    const brightScene: SceneDocument = {
      ...darkCyberpunkScene,
      sceneName: 'Bright Scene',
      description: 'A simple bright scene.',
      objects: [
        {
          ...darkCyberpunkScene.objects[0],
          material: { color: '#f8fafc' },
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
    };

    const result = service.enhanceIfNeeded('Make a white cube.', brightScene);

    expect(result).toBe(brightScene);
  });
});
