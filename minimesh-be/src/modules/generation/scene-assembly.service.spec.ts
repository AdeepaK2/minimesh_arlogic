import { SceneAssemblyService } from './scene-assembly.service';

describe('SceneAssemblyService', () => {
  it('assembles valid parts into a capped SceneDocument', () => {
    const service = new SceneAssemblyService();
    const scene = service.assemble(
      {
        sceneName: 'Capped Scene',
        description: 'A scene with too many repeated objects.',
        styleKeywords: [],
        cameraIntent: 'cinematic angle',
        lightingIntent: 'balanced lighting',
        maxObjectBudget: 2,
        entityGroups: [
          {
            id: 'props',
            label: 'Props',
            query: 'props',
            priority: 5,
          },
        ],
      },
      [
        {
          groupId: 'props',
          groupLabel: 'Props',
          source: 'template',
          fragment: {
            objects: Array.from({ length: 4 }, (_, index) => ({
              id: 'repeat-object',
              name: `Object ${index + 1}`,
              type: 'box',
              position: [index, 0.5, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
              material: { color: '#38bdf8' },
            })),
            lights: [],
          },
        },
      ],
    );

    expect(scene.objects).toHaveLength(2);
    expect(scene.objects[0].id).toBe('repeat-object');
    expect(scene.objects[1].id).toBe('repeat-object-2');
    expect(scene.lights.length).toBeGreaterThan(0);
  });
});
