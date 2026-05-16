# MiniMesh System Summary

MiniMesh is a prompt-to-3D scene generation app. Users log in, create projects, generate 3D scenes from prompts, save scenes and versions, select generated model entities, refine them, and export the current scene as a GLB.

The system is intentionally JSON-first: AI output is never treated as executable code. The canonical source of truth is validated Scene JSON. GLB is only an exported artifact generated from the current scene in the browser.

## Current Product Flow

1. A user signs up or logs in with Supabase email/password auth.
2. The frontend loads an authenticated dashboard.
3. The user creates or opens a project.
4. The project studio opens at `/projects/[projectId]`.
5. The user enters a prompt and clicks Generate.
6. The NestJS backend validates the Supabase access token.
7. The backend generates a validated `SceneDocument`.
8. The frontend renders the scene with React Three Fiber.
9. The user can select entities, transform them, isolate them, refine them, save the scene, save a new version, or export GLB.

## Repository Layout

```txt
Minimesh/
  minimesh-be/       NestJS backend
  minimesh-fe/       Next.js frontend
  supabase/          SQL schema, RLS policies, pgvector/template seed data
  docs/              System documentation
```

## Backend Overview

The backend is a NestJS app in `minimesh-be`.

Main responsibilities:

- Authenticate API requests with Supabase access tokens.
- Call MiniMax through a provider wrapper.
- Convert prompts into strict Scene JSON.
- Validate AI output with Zod.
- Repair malformed AI JSON once when possible.
- Manage projects, scenes, and scene versions.
- Run the RAG/template-assisted generation pipeline for complex prompts.
- Apply lighting and composition improvements before returning a scene.
- Refine a selected entity without rewriting unrelated scene entities.

## Backend Modules

### Generation Module

Path:

```txt
minimesh-be/src/modules/generation
```

Important capabilities:

- `POST /generation/scene`
- `POST /generation/entity-refinement`
- prompt planning
- part-based generation
- scene assembly
- lighting/composition pass
- selected entity refinement

The generation endpoint returns:

```ts
{
  scene: SceneDocument;
  warnings: string[];
}
```

The backend never returns AI-generated executable code. It only returns validated JSON.

### Projects Module

Project APIs:

```txt
GET    /projects
GET    /projects/:id
POST   /projects
PATCH  /projects/:id
DELETE /projects/:id
```

Projects are user-owned. The backend derives ownership from the verified Supabase token, not from client-provided `user_id`.

### Scenes Module

Project-scoped scene APIs:

```txt
GET    /projects/:projectId/scenes
POST   /projects/:projectId/scenes
GET    /projects/:projectId/scenes/:sceneId
POST   /projects/:projectId/scenes/:sceneId/versions
PATCH  /projects/:projectId/scenes/:sceneId
DELETE /projects/:projectId/scenes/:sceneId
GET    /projects/:projectId/scenes/:sceneId/versions
```

Scenes belong to projects. A scene can have many saved versions.

### Templates Module

Path:

```txt
minimesh-be/src/modules/templates
```

This module retrieves trusted reusable scene fragments from Supabase. It is pgvector-ready and can also fall back to keyword matching.

Templates are used for complex prompts such as:

```txt
Create a futuristic cyberpunk street at night with a hovering sports car...
```

Instead of asking MiniMax to generate the whole scene in one fragile pass, the backend can retrieve useful parts like hover car, wet road, neon signs, buildings, lamps, crates, pipes, and light panels.

## Generation Pipeline

MiniMesh currently supports two generation paths.

### Simple Prompt Path

Used for smaller prompts.

1. Build strict schema instructions.
2. Send prompt to MiniMax.
3. Parse JSON.
4. Validate with Zod.
5. Try one repair if invalid.
6. Apply deterministic fallback improvements where needed.
7. Return validated `SceneDocument`.

### Complex Prompt Path

Used for larger prompts with multiple requested entities.

1. `GenerationPlannerService` analyzes the prompt.
2. The planner extracts scene intent, style, lighting intent, camera intent, object budget, and entity groups.
3. `TemplatesService` retrieves trusted templates per entity group.
4. `PartGenerationService` creates or adapts scene fragments.
5. `SceneAssemblyService` merges the parts into one scene.
6. Entity metadata is attached to objects.
7. `LightingAgentService` improves lighting, camera, background, fog, exposure, and emissive materials.
8. The final scene is validated with `SceneDocumentSchema`.
9. The endpoint returns the scene and warnings.

Common warning:

```txt
Generated with template-assisted multi-part pipeline.
```

## Lighting And Composition

The lighting pass exists because generated objects alone can be too dark or unreadable, especially for night scenes.

The lighting/composition pass can add or adjust:

- ambient light
- key directional light
- rim light
- point lights for neon/night scenes
- camera position and target
- background color
- fog color and range
- exposure
- emissive material hints

For cyberpunk/night prompts, the system biases toward:

- dark blue background/fog
- cyan, pink, and purple point lights
- higher exposure
- emissive neon objects
- camera focused on the main subject

## Scene JSON

The core scene shape is `SceneDocument`.

Conceptually:

```ts
type SceneDocument = {
  sceneName: string;
  description?: string;
  objects: SceneObject[];
  entities?: SceneEntity[];
  lights: SceneLight[];
  camera: SceneCamera;
  environment?: SceneEnvironment;
};
```

Supported primitive object types:

```txt
box
sphere
cylinder
cone
torus
plane
```

Each object can include:

- `id`
- `name`
- `type`
- `position`
- `rotation`
- `scale`
- `material`
- optional `entityId`
- optional `role`
- optional animation metadata

Materials can include:

- `color`
- `metalness`
- `roughness`
- optional `emissive`
- optional `emissiveIntensity`

Environment can include:

- `backgroundColor`
- `fogColor`
- `fogNear`
- `fogFar`
- `exposure`

Old scenes remain valid because entities, environment, and emissive material fields are optional.

## Selectable Entities

MiniMesh groups primitives into model-level entities.

Example entities:

- Hover Sports Car
- Neon Sign
- Wet Road
- Low Poly Building
- Street Lamp
- Small Crates

An entity contains:

```ts
type SceneEntity = {
  id: string;
  name: string;
  description?: string;
  sourceGroupId?: string;
  objectIds: string[];
  tags?: string[];
  transform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  };
};
```

Each object can point back to its parent entity with `entityId`.

Frontend behavior:

- Clicking any primitive selects its parent entity.
- All objects in that entity are highlighted.
- The entity panel shows metadata and object count.
- The user can isolate the selected entity.
- The user can transform the selected entity locally.
- Ground, road, floor, and platform-like entities are locked by default so users do not accidentally move the base plane.
- Saving stores the full updated scene JSON.

If an old saved scene has no `entities`, the frontend derives fallback entities from objects so the scene remains usable.

## Entity Refinement

Endpoint:

```txt
POST /generation/entity-refinement
```

Request:

```ts
{
  scene: SceneDocument;
  entityId: string;
  instruction: string;
}
```

Response:

```ts
{
  scene: SceneDocument;
  warnings: string[];
}
```

The backend should preserve unrelated entities. The selected entity is refined, validated, and returned as part of a complete scene.

## Frontend Overview

The frontend is a Next.js app in `minimesh-fe`.

Main responsibilities:

- Supabase email/password signup and login.
- Authenticated dashboard.
- Project creation and navigation.
- Project studio layout.
- Prompt input and generation actions.
- Scene library and version history.
- Entity selection and editing.
- Three.js rendering.
- GLB export.
- Light/dark theme support.

## Frontend Routes

Dashboard:

```txt
/
```

Project Studio:

```txt
/projects/[projectId]
```

The studio is designed as a fixed-height app workspace so users can see the viewport in one area without scrolling through the entire browser page.

## Frontend Components

Important areas:

```txt
minimesh-fe/src/components/generator
minimesh-fe/src/components/scene
minimesh-fe/src/lib/api
minimesh-fe/src/lib/scene
```

Generator components include:

- `generator-workspace.tsx`
- `prompt-panel.tsx`
- `scene-library.tsx`
- `entity-panel.tsx`

Scene components include:

- `scene-viewport.tsx`
- `primitive-object.tsx`

Scene helpers include:

- entity derivation
- entity transform helpers
- selection/isolation logic

## Viewport Controls

The viewport renders with React Three Fiber and Drei.

Current behavior:

- Orbit controls for navigation.
- Grid/floor reference.
- Clickable primitives.
- Entity highlighting.
- Isolate/show all selected entity.
- Camera view buttons such as Home, Top, Front, Right, and Fit.
- JSON panel is collapsed by default to keep the 3D view readable.

The goal is closer to a lightweight Blender-style studio experience: the main viewport stays central, while editing controls remain available in side panels.

## GLB Export

GLB export is client-side.

The frontend converts the rendered scene into a GLB using Three.js `GLTFExporter`.

Important rule:

```txt
Scene JSON is source of truth.
GLB is an export artifact.
```

This means saved scenes should store JSON, not generated GLB files. Storage upload can be added later.

## Supabase Overview

Supabase provides:

- Auth
- Postgres database
- RLS policies
- pgvector for template retrieval

Schema file:

```txt
supabase/schema.sql
```

Main tables:

```txt
profiles
projects
scenes
scene_versions
object_templates
template_embeddings
```

## Data Model

### Profiles

Stores basic user metadata.

```txt
profiles.id references auth.users(id)
```

### Projects

User-owned project workspace.

```txt
projects.user_id references auth.users(id)
```

### Scenes

Saved scene entry inside a project.

Important fields:

- `project_id`
- `user_id`
- `name`
- `description`
- `latest_scene_json`
- `latest_prompt`
- `latest_version_number`

### Scene Versions

Manual version history for saved scenes.

Important fields:

- `scene_id`
- `user_id`
- `version_number`
- `prompt`
- `scene_json`
- `warnings`

### Object Templates

Curated trusted scene fragments.

Examples:

- Hover Sports Car
- Reflective Wet Road
- Low Poly Building Block
- Neon Sign Panel
- Holographic Billboard
- Street Lamp
- Traffic Barrier
- Utility Pipe Cluster
- Rooftop Antenna
- Small Crates
- Floating Light Panels

### Template Embeddings

Vector embeddings for semantic retrieval.

The schema uses:

```sql
vector(384)
```

and provides:

```sql
match_object_templates(query_embedding, match_count)
```

## Security Rules

Important backend rules:

- Never trust `user_id` from the client.
- Always derive the user from the verified Supabase token.
- Protect generation, projects, scenes, and versions with auth.
- Check project ownership before scene operations.
- Check scene ownership and project membership.
- Treat all AI output as untrusted.
- Validate all generated JSON with Zod.
- Never execute AI-generated code.
- Keep Supabase service credentials backend-only.
- Frontend uses only public Supabase browser credentials.

Important database rules:

- RLS is enabled for user-owned tables.
- Users can access only their own projects, scenes, and versions.
- Public templates are selectable.
- Template embeddings are selectable only for public templates.

## Environment Variables

Backend environment typically needs:

```txt
MINIMAX_API_KEY
MINIMAX_API_URL
MINIMAX_MODEL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
```

Frontend environment typically needs:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_BASE_URL
```

Do not expose backend-only secrets in frontend environment files.

## Clean Architecture Rules Used

Backend:

- Controllers handle HTTP only.
- Services contain use-case logic.
- Supabase access is behind a service.
- MiniMax access is behind an AI provider wrapper.
- Zod schemas define the trusted boundary.
- Generation logic is split into planning, retrieval, part generation, assembly, lighting, and refinement.

Frontend:

- API calls live outside UI components.
- Scene rendering is separated from prompt UI.
- Renderer consumes `SceneDocument`.
- Entity helpers live outside component JSX where practical.
- Export logic is isolated from normal rendering.

## Known Limitations

- The system still renders primitive-based low-poly scenes, not arbitrary mesh topology.
- Generated quality depends on the prompt, templates, and MiniMax response quality.
- pgvector retrieval depends on embeddings being populated for templates.
- Some templates may be returned through keyword fallback if embeddings are missing.
- Entity transforms are local JSON edits until the user saves.
- Entity refinement is constrained to selected entity behavior, but complex instructions may still need more guardrails.
- No Supabase Storage upload for GLB yet.
- No thumbnail generation yet.
- No collaborative sharing yet.

## Recommended Next Steps

1. Add a template embedding seed script so every curated template has a vector.
2. Add visible generation progress states: Planning, Retrieving, Building, Lighting, Validating.
3. Add a proper transform gizmo for selected entities.
4. Add primitive-level advanced selection mode.
5. Add thumbnail generation for saved scenes.
6. Add Supabase Storage upload for exported GLB.
7. Add scene/object template creation tools for curated reuse.
8. Add more backend tests around entity refinement and lighting.
9. Add frontend tests for selection, isolate, transforms, and old scene compatibility.

## Mental Model

MiniMesh should be understood as:

```txt
Prompt
  -> Scene Plan
  -> Entity Groups
  -> Retrieved Templates
  -> Generated Parts
  -> Scene Assembly
  -> Lighting/Composition
  -> Validated Scene JSON
  -> Rendered Three.js Scene
  -> Optional GLB Export
```

The most important product idea is that users are not just generating one flat scene. They are building a project made of saved scenes, and each scene is made of selectable model entities that can be inspected, transformed, refined, versioned, and exported.
