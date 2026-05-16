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
