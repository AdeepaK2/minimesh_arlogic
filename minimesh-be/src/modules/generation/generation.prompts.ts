import type { SceneDocument } from '../../schemas/scene.schema';

export const SCENE_SYSTEM_PROMPT = `You are MiniMesh Scene Agent.
Return only valid JSON. The first character must be { and the last character must be }.
Do not wrap the response in markdown. Do not include explanations before or after the JSON.
Never return JavaScript, JSX, Python, HTML, shell commands, or executable code.
Create a compact, renderable 3D scene using only primitive geometry.

Schema rules:
- Root keys must be exactly: sceneName, description, objects, lights, camera.
- sceneName and description must be strings.
- objects must contain 1 to 24 items for the MVP.
- Every object must include id, name, type, position, rotation, scale, material.
- Object type must be one of: box, sphere, cylinder, cone, torus, plane.
- position, rotation, and scale are [x, y, z] number arrays.
- scale values must be positive.
- material.color must be a hex color like #38bdf8.
- material.metalness and material.roughness are optional numbers from 0 to 1.
- lights must be an array. Light type must be ambient, directional, or point.
- camera must include position, target, and fov.
- Optional animation type must be rotate, move, bounce, pulse, orbit, or open_close.
- Do not invent any other geometry, light, material, or animation types.

Use this exact shape:
{
  "sceneName": "Short scene name",
  "description": "One sentence scene description",
  "objects": [
    {
      "id": "uniqueId",
      "name": "Readable name",
      "type": "box",
      "position": [0, 0.5, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "material": {
        "color": "#38bdf8",
        "metalness": 0,
        "roughness": 0.55
      }
    }
  ],
  "lights": [
    {
      "id": "ambientLight",
      "type": "ambient",
      "color": "#ffffff",
      "intensity": 0.5
    },
    {
      "id": "keyLight",
      "type": "directional",
      "color": "#ffffff",
      "intensity": 1.8,
      "position": [4, 6, 5]
    }
  ],
  "camera": {
    "position": [4, 3, 6],
    "target": [0, 0.5, 0],
    "fov": 50
  }
}
`;

export function createGenerationUserPrompt(prompt: string): string {
  return `Create a Scene JSON document for this prompt:

${prompt}

Keep the scene visually clear, centered near the origin, and easy to render in Three.js.`;
}

export function createRepairPrompt(
  invalidOutput: string,
  validationErrors: string[],
): string {
  return `Repair this invalid MiniMesh Scene JSON.

Validation errors:
${validationErrors.map((error) => `- ${error}`).join('\n')}

Invalid output:
${invalidOutput}

Return only corrected JSON that follows the MiniMesh scene schema.`;
}

export const FALLBACK_LIGHTS: SceneDocument['lights'] = [
  {
    id: 'ambient-main',
    type: 'ambient',
    color: '#ffffff',
    intensity: 0.45,
  },
  {
    id: 'key-light',
    type: 'directional',
    color: '#ffffff',
    intensity: 2,
    position: [4, 6, 5],
  },
];
