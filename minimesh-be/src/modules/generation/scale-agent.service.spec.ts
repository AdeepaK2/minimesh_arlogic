import type { SceneDocument } from '../../schemas/scene.schema';
import { ScaleAgentService } from './scale-agent.service';

describe('ScaleAgentService', () => {
  const service = new ScaleAgentService();

  it('scales cricket wickets against the existing bat reference', () => {
    const scene: SceneDocument = {
      sceneName: 'Cricket Bat and Ball',
      objects: [
        {
          id: 'bat-blade',
          name: 'Cricket bat blade',
          entityId: 'bat',
          type: 'box',
          position: [0, 1.5, 0],
          rotation: [0, 0, 0],
          scale: [0.35, 3, 0.12],
          material: { color: '#a67c52' },
        },
        {
          id: 'wicket-stump-left',
          name: 'Wicket stump left',
          entityId: 'wickets',
          type: 'cylinder',
          position: [1, 0.2, 0],
          rotation: [0, 0, 0],
          scale: [0.035, 0.32, 0.035],
          material: { color: '#f8fafc' },
        },
        {
          id: 'cricket-ball',
          name: 'Red cricket ball',
          entityId: 'ball',
          type: 'sphere',
          position: [0.7, 0.28, 0],
          rotation: [0, 0, 0],
          scale: [0.28, 0.28, 0.28],
          material: { color: '#dc2626' },
        },
      ],
      entities: [
        {
          id: 'bat',
          name: 'Cricket Bat',
          objectIds: ['bat-blade'],
          tags: ['cricket', 'bat'],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
        {
          id: 'wickets',
          name: 'Wicket stumps',
          objectIds: ['wicket-stump-left'],
          tags: ['cricket', 'wicket', 'stump'],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
        {
          id: 'ball',
          name: 'Cricket ball',
          objectIds: ['cricket-ball'],
          tags: ['cricket', 'ball'],
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

    const result = service.enhance(scene);
    const stump = result.objects.find(
      (object) => object.id === 'wicket-stump-left',
    );
    const ball = result.objects.find((object) => object.id === 'cricket-ball');

    expect(stump?.scale[1]).toBeGreaterThanOrEqual(1.8);
    expect(stump?.position[1]).toBeGreaterThanOrEqual((stump?.scale[1] ?? 0) / 2);
    expect(ball?.scale[0]).toBeGreaterThanOrEqual(0.45);
    expect(ball?.scale[0]).toBeLessThanOrEqual(0.5);
  });

  it('leaves non-cricket scenes unchanged', () => {
    const scene: SceneDocument = {
      sceneName: 'Desk',
      objects: [
        {
          id: 'tiny-post',
          name: 'Tiny decorative post',
          type: 'cylinder',
          position: [0, 0.15, 0],
          rotation: [0, 0, 0],
          scale: [0.04, 0.3, 0.04],
          material: { color: '#64748b' },
        },
      ],
      lights: [],
      camera: { position: [5, 4, 7], target: [0, 0, 0], fov: 45 },
    };

    expect(service.enhance(scene)).toEqual(scene);
  });
});
