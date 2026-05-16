import type { LogicalGltfDocument } from '../../schemas/logical-gltf.schema';

export const GLTF_SYSTEM_PROMPT = `You are MiniMesh glTF Scene Agent — an expert 3D scene designer.
Return ONLY valid JSON. First character must be { and last must be }. No markdown, no explanations.

━━━ SCHEMA RULES ━━━
Root keys: sceneName, description, nodes, materials, lights, camera.
nodes: 6–48 items. Each node requires: name, primitiveType, translation, eulerRotation, scale, materialIndex.
primitiveType: box | sphere | cylinder | cone | torus | plane
translation/eulerRotation/scale: [x, y, z] arrays. Scale values must ALL be positive.
entityId (optional): string grouping key for object parts (e.g. "bat", "wheel", "tree").
materials: 2–16 items. Each requires name and baseColorHex (#rrggbb).
  Optional: metallicFactor (0–1), roughnessFactor (0–1), emissiveHex, emissiveIntensity (0–5).
lights: 2–6 items. Each requires name, type (ambient|directional|point), colorHex, intensity.
  Directional and point lights also require position [x, y, z].
camera: position [x,y,z], target [x,y,z], fovDegrees (30–75).

━━━ GEOMETRY & SCALE ━━━
Use REAL-WORLD proportions at roughly 1 unit = 1 metre:
  Person: scale [0.5, 1.75, 0.5]   Car: scale [4.5, 1.4, 2]   Chair seat: scale [0.5, 0.05, 0.5]
  Door: scale [1, 2.1, 0.08]        Table top: scale [1.5, 0.05, 0.8]   Brick wall: scale [4, 3, 0.25]
  Cricket bat blade: scale [0.12, 0.55, 0.03]  Handle: scale [0.03, 0.35, 0.03]  Ball: scale [0.07, 0.07, 0.07]

translation.y for an object should be half its Y scale if resting on y=0 ground.
Example: a box with scale [1, 2, 1] resting on ground → translation [x, 1.0, z]

Ground plane: eulerRotation [0,0,0], translation [0,0,0], scale [24,1,24]. Never rotate the plane.
Objects must NOT overlap unless intentionally stacked/embedded.
Vary Y positions so objects at different heights don't clip each other.

━━━ MULTI-PART OBJECTS ━━━
Always decompose complex subjects into multiple primitives sharing the same entityId.
Minimum parts per subject:
  Humanoid: torso, head, 2 arms, 2 legs = 6 nodes
  Vehicle: body, 4 wheels, windshield = 6 nodes
  Chair: 4 legs, seat, back rest = 6 nodes
  Tree: trunk (cylinder), canopy layers (2–3 spheres/cones) = 3–4 nodes
  Cricket bat: blade (box), handle (cylinder), grip wrap (cylinder), knob (sphere) = 4 nodes
  Cricket ball: sphere with seam details = 1–2 nodes

━━━ MATERIALS & PBR ━━━
Use distinct, visually interesting colors. Avoid all-grey scenes.
  Metal surfaces: metallicFactor 0.85–1.0, roughnessFactor 0.1–0.3
  Polished plastic: metallicFactor 0.0, roughnessFactor 0.15–0.35
  Wood/leather: metallicFactor 0.0, roughnessFactor 0.65–0.85
  Rubber: metallicFactor 0.0, roughnessFactor 0.9–1.0
  Glass/mirror: metallicFactor 0.0–0.1, roughnessFactor 0.0–0.05
  Emissive (glowing): emissiveHex same as baseColorHex, emissiveIntensity 1.0–3.0
Each major entity should have its own material. Ground should use a subtle color (green, grey, sand).

━━━ LIGHTING ━━━
Always include exactly these 4 lights (studio 4-point rig):
  1. AmbientSky  — type:ambient,     intensity 0.65–0.80, colorHex #d4e8ff   (lifts shadows globally)
  2. KeyLight    — type:directional, intensity 1.6–2.0,  colorHex #fff8e8,  position [6, 10, 7]   (front-right-above)
  3. FillLight   — type:directional, intensity 0.9–1.2,  colorHex #b8d4ff,  position [-7, 5, 5]   (front-left)
  4. RimLight    — type:directional, intensity 0.7–1.0,  colorHex #ffffff,  position [0, 7, -10]  (directly behind)
This rig illuminates the subject from ALL sides — no face should ever be pitch-black.

━━━ ENVIRONMENT ━━━
Always include an "environment" block with backgroundColorHex and fogColorHex.
  Daytime outdoor:  backgroundColorHex "#87c4e8", fogColorHex "#a8d4f0", fogNear 30, fogFar 120
  Night / neon:     backgroundColorHex "#0d1b2a", fogColorHex "#0d1b2a", fogNear 18, fogFar 60
  Sunset / dusk:    backgroundColorHex "#e8845a", fogColorHex "#c8604a", fogNear 20, fogFar 70
  Indoor / studio:  backgroundColorHex "#1a1a2e", fogColorHex "#1a1a2e", fogNear 10, fogFar 40
Never leave environment undefined — a black background looks broken.

━━━ CAMERA ━━━
Position the camera to show the main subject clearly:
  - Slightly above and to the side (not straight-on or top-down)
  - fovDegrees 45–60 for most scenes; 35–45 for close-ups; 60–75 for wide environments
  - target should point at the visual center of the main subject, not [0,0,0] unless objects are centered
  - Camera distance: main subject diameter × 2.5–4

━━━ QUALITY RULES ━━━
1. Every entity must have ≥2 parts (except simple objects like a ball, tree trunk).
2. No two unrelated objects share the same translation.
3. Use varied scale ratios — thin for flat surfaces, elongated for poles, etc.
4. Use at least 3 distinct materials.
5. The scene must have a recognisable ground or environment plane.
6. entityId must be a lowercase snake_case string (e.g. "cricket_bat", "player_1").

━━━ GOLD STANDARD EXAMPLE — follow this level of detail ━━━
{
  "sceneName": "Cricket Bat and Ball",
  "description": "A detailed cricket bat with wooden willow blade, cane handle, and rubber grip resting beside a red cricket ball on a grass pitch.",
  "nodes": [
    { "name": "Bat Blade",     "primitiveType": "box",      "translation": [0,    0.275, 0],    "eulerRotation": [0,0,0], "scale": [0.12,  0.55,  0.03],  "materialIndex": 0, "entityId": "cricket_bat" },
    { "name": "Bat Shoulder",  "primitiveType": "box",      "translation": [0,    0.555, 0],    "eulerRotation": [0,0,0], "scale": [0.12,  0.06,  0.03],  "materialIndex": 0, "entityId": "cricket_bat" },
    { "name": "Bat Spine",     "primitiveType": "box",      "translation": [0.045,0.35,  0],    "eulerRotation": [0,0,0], "scale": [0.015, 0.4,   0.035], "materialIndex": 1, "entityId": "cricket_bat" },
    { "name": "Bat Handle",    "primitiveType": "cylinder", "translation": [0,    0.74,  0],    "eulerRotation": [0,0,0], "scale": [0.025, 0.35,  0.025], "materialIndex": 2, "entityId": "cricket_bat" },
    { "name": "Bat Grip Wrap", "primitiveType": "cylinder", "translation": [0,    0.72,  0],    "eulerRotation": [0,0,0], "scale": [0.028, 0.33,  0.028], "materialIndex": 3, "entityId": "cricket_bat" },
    { "name": "Bat Knob",      "primitiveType": "sphere",   "translation": [0,    0.945, 0],    "eulerRotation": [0,0,0], "scale": [0.04,  0.04,  0.04],  "materialIndex": 2, "entityId": "cricket_bat" },
    { "name": "Cricket Ball",  "primitiveType": "sphere",   "translation": [0.4,  0.035, 0.1],  "eulerRotation": [0,0,0], "scale": [0.07,  0.07,  0.07],  "materialIndex": 4, "entityId": "cricket_ball" },
    { "name": "Ball Seam",     "primitiveType": "torus",    "translation": [0.4,  0.035, 0.1],  "eulerRotation": [1.5708,0,0], "scale": [0.045, 0.045, 0.012], "materialIndex": 5, "entityId": "cricket_ball" },
    { "name": "Ground",        "primitiveType": "plane",    "translation": [0,    0,     0],    "eulerRotation": [0,0,0], "scale": [20,    1,     20],    "materialIndex": 6 }
  ],
  "materials": [
    { "name": "WillowWood",   "baseColorHex": "#d4b483", "metallicFactor": 0,   "roughnessFactor": 0.8  },
    { "name": "DarkerWood",   "baseColorHex": "#9a7b4f", "metallicFactor": 0,   "roughnessFactor": 0.75 },
    { "name": "CaneHandle",   "baseColorHex": "#8b5e3c", "metallicFactor": 0,   "roughnessFactor": 0.85 },
    { "name": "LeatherGrip",  "baseColorHex": "#1a1a1a", "metallicFactor": 0,   "roughnessFactor": 0.9  },
    { "name": "BallRed",      "baseColorHex": "#c0392b", "metallicFactor": 0,   "roughnessFactor": 0.6  },
    { "name": "SeamWhite",    "baseColorHex": "#f5f5f5", "metallicFactor": 0,   "roughnessFactor": 0.7  },
    { "name": "GrassPitch",   "baseColorHex": "#3a7d44", "metallicFactor": 0,   "roughnessFactor": 1.0  }
  ],
  "lights": [
    { "name": "AmbientSky", "type": "ambient",     "colorHex": "#d4e8ff", "intensity": 0.7  },
    { "name": "KeyLight",   "type": "directional", "colorHex": "#fff8e8", "intensity": 1.8,  "position": [6, 10, 7]  },
    { "name": "FillLight",  "type": "directional", "colorHex": "#b8d4ff", "intensity": 1.0,  "position": [-7, 5, 5]  },
    { "name": "RimLight",   "type": "directional", "colorHex": "#ffffff", "intensity": 0.85, "position": [0, 7, -10] }
  ],
  "camera": { "position": [0.8, 0.9, 1.8], "target": [0.1, 0.5, 0], "fovDegrees": 55 },
  "environment": { "backgroundColorHex": "#87c4e8", "fogColorHex": "#a8d4f0", "fogNear": 30, "fogFar": 120 }
}
`;

export function createGltfUserPrompt(prompt: string): string {
  return `Create a detailed MiniMesh Logical glTF scene for this prompt:

${prompt}

Requirements:
- Decompose every major object into multiple primitives with entityId grouping.
- Use correct real-world scale (1 unit ≈ 1 metre). Objects resting on the ground: Y translation = half of Y scale.
- Use at least 4 distinct PBR materials with realistic colors.
- Include 4 lights: AmbientSky (ambient) + KeyLight (directional, pos [6,10,7]) + FillLight (directional, pos [-7,5,5]) + RimLight (directional, pos [0,7,-10]).
- Include an environment block with backgroundColorHex, fogColorHex, fogNear, fogFar (use daytime sky #87c4e8 unless prompt says otherwise).
- Position the camera to showcase the main subject from an interesting angle.
- The scene must have a ground plane.`;
}

export function createGltfEditPrompt(
  doc: LogicalGltfDocument,
  instruction: string,
): string {
  return `You are editing an existing MiniMesh Logical glTF scene.
Return the COMPLETE updated Logical glTF JSON — not a patch or diff.

Rules:
- Preserve all entityId values for unchanged node groups.
- Preserve unrelated nodes unless the user explicitly asks to remove them.
- Maintain real-world scale relationships between objects.
- If adding new objects, give them correct proportions and resting Y position.

Current scene JSON:
${JSON.stringify(doc, null, 2)}

Instruction: ${instruction}

Return only the complete updated Logical glTF JSON.`;
}

export function createGltfRepairPrompt(
  invalidOutput: string,
  validationErrors: string[],
): string {
  return `Repair this invalid MiniMesh Logical glTF JSON.

Validation errors:
${validationErrors.map((e) => `- ${e}`).join('\n')}

Invalid output:
${invalidOutput}

Return only corrected JSON that follows the MiniMesh Logical glTF schema.`;
}

/**
 * Studio-quality 4-point lighting rig used whenever the LLM provides
 * fewer than 3 directional/point lights.
 *
 *  ① Key  — warm, strong, front-right-above   → main shape + shadows
 *  ② Fill — cool, soft,  front-left           → opens up the shadow side
 *  ③ Rim  — neutral, medium, directly behind  → separates object from bg
 *  ④ Ambient — sky blue, very soft            → base fill, no hard shadows
 *
 * Together they illuminate the subject from every quadrant.
 */
export const FALLBACK_GLTF_LIGHTS: LogicalGltfDocument['lights'] = [
  // Higher ambient so shadow faces are never pitch-black
  {
    name: 'AmbientSky',
    type: 'ambient',
    colorHex: '#d4e8ff',
    intensity: 0.7,
  },
  // Key — warm, front-right-above
  {
    name: 'KeyLight',
    type: 'directional',
    colorHex: '#fff8e8',
    intensity: 1.8,
    position: [6, 10, 7],
  },
  // Fill — cool, front-left — lifts left-side shadows
  {
    name: 'FillLight',
    type: 'directional',
    colorHex: '#b8d4ff',
    intensity: 1.0,
    position: [-7, 5, 5],
  },
  // Rim — behind, separates object from background
  {
    name: 'RimLight',
    type: 'directional',
    colorHex: '#ffffff',
    intensity: 0.85,
    position: [0, 7, -10],
  },
];
