/**
 * Pre-approved high-quality scene references.
 * These are seeded into object_templates + template_embeddings on startup
 * (only if a template with the same name does not already exist).
 * Add new examples here to grow the RAG database without needing the UI.
 */
export interface SceneSeedEntry {
  name: string;
  category: string;
  description: string;
  tags: string[];
  scene: object;
}

export const APPROVED_SCENE_SEEDS: SceneSeedEntry[] = [
  {
    name: 'Cricket Bat and Ball',
    category: 'sports',
    description:
      'A detailed cricket bat with wooden willow blade, cane handle, and rubber grip resting beside a red cricket ball on a grass pitch.',
    tags: ['cricket', 'sports', 'bat', 'ball', 'grass', 'outdoor'],
    scene: {
      sceneName: 'Cricket Bat and Ball',
      description:
        'A detailed cricket bat with wooden willow blade, cane handle, and rubber grip resting beside a red cricket ball on a grass pitch.',
      objects: [
        {
          id: 'Ground',
          name: 'Ground',
          entityId: 'ground',
          type: 'plane',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [20, 1, 20],
          material: { color: '#3a7d44', metalness: 0, roughness: 1 },
        },
        {
          id: 'Bat-Blade',
          name: 'Bat Blade',
          entityId: 'cricket_bat',
          type: 'box',
          position: [0, 0.275, 0],
          rotation: [0, 0, 0],
          scale: [0.12, 0.55, 0.03],
          material: { color: '#d4b483', metalness: 0, roughness: 0.8 },
        },
        {
          id: 'Bat-Shoulder',
          name: 'Bat Shoulder',
          entityId: 'cricket_bat',
          type: 'box',
          position: [0, 0.555, 0],
          rotation: [0, 0, 0],
          scale: [0.12, 0.06, 0.03],
          material: { color: '#d4b483', metalness: 0, roughness: 0.8 },
        },
        {
          id: 'Bat-Spine-Ridge',
          name: 'Bat Spine Ridge',
          entityId: 'cricket_bat',
          type: 'box',
          position: [0.045, 0.35, 0],
          rotation: [0, 0, 0],
          scale: [0.015, 0.4, 0.035],
          material: { color: '#9a7b4f', metalness: 0, roughness: 0.75 },
        },
        {
          id: 'Bat-Handle',
          name: 'Bat Handle',
          entityId: 'cricket_bat',
          type: 'cylinder',
          position: [0, 0.74, 0],
          rotation: [0, 0, 0],
          scale: [0.025, 0.35, 0.025],
          material: { color: '#8b5e3c', metalness: 0, roughness: 0.85 },
        },
        {
          id: 'Bat-Grip-Wrap',
          name: 'Bat Grip Wrap',
          entityId: 'cricket_bat',
          type: 'cylinder',
          position: [0, 0.72, 0],
          rotation: [0, 0, 0],
          scale: [0.028, 0.33, 0.028],
          material: { color: '#1a1a1a', metalness: 0, roughness: 0.9 },
        },
        {
          id: 'Bat-Knob',
          name: 'Bat Knob',
          entityId: 'cricket_bat',
          type: 'sphere',
          position: [0, 0.945, 0],
          rotation: [0, 0, 0],
          scale: [0.04, 0.04, 0.04],
          material: { color: '#8b5e3c', metalness: 0, roughness: 0.85 },
        },
        {
          id: 'Cricket-Ball-Main',
          name: 'Cricket Ball Main',
          entityId: 'cricket_ball',
          type: 'sphere',
          position: [0.4, 0.07, 0.15],
          rotation: [0, 0, 0],
          scale: [0.07, 0.07, 0.07],
          material: { color: '#c0392b', metalness: 0, roughness: 0.6 },
        },
        {
          id: 'Ball-Seam-Left',
          name: 'Ball Seam Left',
          entityId: 'cricket_ball',
          type: 'torus',
          position: [0.4, 0.07, 0.15],
          rotation: [1.5708, 0, 0],
          scale: [0.045, 0.045, 0.012],
          material: { color: '#f5f5f5', metalness: 0, roughness: 0.7 },
        },
        {
          id: 'Ball-Seam-Right',
          name: 'Ball Seam Right',
          entityId: 'cricket_ball',
          type: 'torus',
          position: [0.4, 0.07, 0.15],
          rotation: [1.5708, 0, 0.4],
          scale: [0.045, 0.045, 0.012],
          material: { color: '#f5f5f5', metalness: 0, roughness: 0.7 },
        },
      ],
      entities: [
        { id: 'ground', name: 'Ground', objectIds: ['Ground'], tags: [] },
        {
          id: 'cricket_bat',
          name: 'Cricket Bat',
          objectIds: ['Bat-Blade', 'Bat-Shoulder', 'Bat-Spine-Ridge', 'Bat-Handle', 'Bat-Grip-Wrap', 'Bat-Knob'],
          tags: [],
        },
        {
          id: 'cricket_ball',
          name: 'Cricket Ball',
          objectIds: ['Cricket-Ball-Main', 'Ball-Seam-Left', 'Ball-Seam-Right'],
          tags: [],
        },
      ],
      lights: [
        { id: 'Ambient-Sky', type: 'ambient', color: '#d0e8ff', intensity: 0.45 },
        { id: 'Sun-Key-Light', type: 'directional', color: '#fff5e0', intensity: 2.4, position: [5, 8, 6] },
        { id: 'Sky-Fill-Light', type: 'directional', color: '#a0c4ff', intensity: 0.65, position: [-4, 3, -3] },
        { id: 'Ball-Highlight', type: 'point', color: '#fffae0', intensity: 0.8, position: [0.5, 0.5, 0.3] },
      ],
      camera: { position: [0.9, 1.1, 2.1], target: [0.2, 0.5, 0.05], fov: 52 },
    },
  },
];
