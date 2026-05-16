import { SceneDocumentSchema } from './scene.schema';

const validScene = {
  sceneName: 'Test Scene',
  objects: [
    {
      id: 'object-1',
      name: 'Blue box',
      type: 'box',
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      material: {
        color: '#38bdf8',
        roughness: 0.5,
      },
    },
  ],
};

describe('SceneDocumentSchema', () => {
  it('accepts a valid primitive scene', () => {
    const result = SceneDocumentSchema.safeParse(validScene);

    expect(result.success).toBe(true);
  });

  it('accepts optional environment and emissive material fields', () => {
    const result = SceneDocumentSchema.safeParse({
      ...validScene,
      objects: [
        {
          ...validScene.objects[0],
          material: {
            ...validScene.objects[0].material,
            emissive: '#38bdf8',
            emissiveIntensity: 1.4,
          },
        },
      ],
      environment: {
        backgroundColor: '#07111f',
        fogColor: '#0f172a',
        fogNear: 14,
        fogFar: 54,
        exposure: 1.65,
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts optional selectable entity metadata', () => {
    const result = SceneDocumentSchema.safeParse({
      ...validScene,
      objects: [
        {
          ...validScene.objects[0],
          entityId: 'entity-1',
          role: 'body',
        },
      ],
      entities: [
        {
          id: 'entity-1',
          name: 'Selectable Box',
          description: 'A selectable generated entity.',
          sourceGroupId: 'group-1',
          objectIds: ['object-1'],
          tags: ['box'],
          transform: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported object types', () => {
    const result = SceneDocumentSchema.safeParse({
      ...validScene,
      objects: [{ ...validScene.objects[0], type: 'mesh' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects scenes above the object limit', () => {
    const result = SceneDocumentSchema.safeParse({
      ...validScene,
      objects: Array.from({ length: 61 }, (_, index) => ({
        ...validScene.objects[0],
        id: `object-${index}`,
      })),
    });

    expect(result.success).toBe(false);
  });
});
