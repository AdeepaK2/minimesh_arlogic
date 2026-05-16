# MiniMesh AI – Complete Backend Architecture

## Overview

MiniMesh AI is an AI-powered text-to-3D and animated scene generation platform.

The backend acts as:

* AI orchestration layer
* validation layer
* retrieval engine
* project persistence layer
* animation metadata manager
* asset management system
* RAG-based scene memory system

The backend is designed using:

* NestJS
* PostgreSQL
* Supabase
* pgvector
* MiniMax API
* Zod
* TypeScript

---

# 1. High-Level System Architecture

```text
Frontend (Next.js + React Three Fiber)
        ↓
NestJS API Gateway
        ↓
Authentication Layer
        ↓
Validation Layer
        ↓
Retrieval Layer (RAG / pgvector)
        ↓
MiniMax Scene Generation Agent
        ↓
Scene Validation + Repair
        ↓
Persistence Layer
        ↓
Storage Layer
        ↓
Frontend Renderer
```

---

# 2. Core Backend Responsibilities

The backend is responsible for:

* handling authentication
* orchestrating AI generation
* validating generated scenes
* refining existing scenes
* retrieving reusable templates
* semantic search
* animation metadata handling
* project persistence
* export metadata management
* storage integration
* API security
* user ownership enforcement

---

# 3. Technology Stack

## Core Framework

* NestJS
* TypeScript
* Node.js

## Database

* PostgreSQL
* Supabase
* JSONB storage

## AI Layer

* MiniMax API
* Structured JSON generation
* Agent-style orchestration

## Validation

* Zod
* DTO validation
* Type-safe scene schema

## Semantic Search

* pgvector
* embeddings
* vector similarity search

## Authentication

* Supabase Auth
* JWT
* Role-based access control

## Storage

* Supabase Storage
* GLB assets
* thumbnails
* exports

---

# 4. Monorepo Architecture

```text
minimesh/
  apps/
    web/
      Next.js frontend

    api/
      NestJS backend

  packages/
    shared/
      shared schemas
      shared types
      validation logic
```

---

# 5. Backend Folder Structure

```text
src/
  main.ts
  app.module.ts

  common/
    decorators/
    guards/
    interceptors/
    filters/
    pipes/
    middleware/

  config/
    env.config.ts

  modules/
    auth/
    users/
    projects/
    scenes/
    generation/
    refinement/
    templates/
    vector-search/
    animations/
    exports/
    storage/

  ai/
    minimax/
      minimax.module.ts
      minimax.service.ts
      agents/
      prompts/

  database/
    supabase/
      supabase.module.ts
      supabase.service.ts

  schemas/
    scene.schema.ts
    animation.schema.ts

  validation/
    validators/
    repair/

  tools/
    retrieval/
    exporters/
    compiler/

  types/
```

---

# 6. Agent Architecture

## Main Agent

### MiniMesh Scene Generation Agent

Responsibilities:

* prompt understanding
* scene composition
* spatial reasoning
* reusable template composition
* animation reasoning
* scene refinement
* structured JSON generation

The agent must:

* never generate executable code
* never generate unsafe output
* always return structured JSON
* follow strict schema rules

---

# 7. Agent Tooling Layer

## Retrieval Tool

Responsibilities:

* retrieve reusable 3D templates
* semantic search
* retrieve animation presets
* retrieve environment assets
* context injection

Technologies:

* PostgreSQL
* pgvector
* Supabase

---

## Validation Tool

Responsibilities:

* JSON validation
* schema validation
* transform validation
* animation validation
* material validation
* safety checks
* object count limits

Technologies:

* Zod
* TypeScript

---

## Repair Tool

Responsibilities:

* fix invalid AI outputs
* repair malformed JSON
* normalize scene structure
* ensure schema compliance

Flow:

```text
Invalid Output
      ↓
Validation Errors
      ↓
Repair Prompt
      ↓
MiniMax Repair Agent
      ↓
Revalidation
```

---

## Scene Compiler Tool

Responsibilities:

* convert structured scene JSON into renderable objects
* map primitives into Three.js geometry
* apply transforms
* apply materials
* attach animations

---

## Export Tool

Responsibilities:

* GLB export metadata
* thumbnail generation
* export persistence
* asset upload

Technologies:

* GLTFExporter
* Supabase Storage

---

# 8. Authentication Architecture

## Authentication Provider

Supabase Auth

Supported methods:

* email/password
* Google OAuth
* GitHub OAuth

---

## JWT Flow

```text
User Login
    ↓
Supabase Auth
    ↓
JWT Issued
    ↓
Frontend Stores Session
    ↓
NestJS JWT Guard
    ↓
Protected APIs
```

---

## Authorization

Use:

* JWT guards
* ownership validation
* role-based permissions
* route protection
* project-level access control

---

# 9. Scene Generation Flow

```text
User Prompt
    ↓
Generation Controller
    ↓
DTO Validation
    ↓
Keyword Extraction
    ↓
Embedding Generation
    ↓
pgvector Retrieval
    ↓
Relevant Templates
    ↓
MiniMax Scene Agent
    ↓
Structured Scene JSON
    ↓
Zod Validation
    ↓
Repair Flow if Needed
    ↓
Save Scene
    ↓
Return Response
```

---

# 10. Scene Refinement Flow

```text
Current Scene
    ↓
Refinement Instruction
    ↓
Refinement Controller
    ↓
Scene Ownership Validation
    ↓
MiniMax Refinement Agent
    ↓
Updated Scene JSON
    ↓
Validation
    ↓
Repair if Needed
    ↓
Save Refinement History
    ↓
Return Updated Scene
```

---

# 11. Animation Architecture

## Supported MVP Animation Types

* rotate
* move
* bounce
* pulse
* orbit
* open_close

---

## Animation Responsibilities

The backend handles:

* animation metadata generation
* animation schema validation
* animation preset retrieval
* animation persistence

Rendering occurs on frontend using:

* React Three Fiber
* Three.js
* useFrame()

---

# 12. Scene Schema

```ts
export const SceneSchema = z.object({
  sceneName: z.string(),

  description: z.string().optional(),

  objects: z.array(
    z.object({
      id: z.string(),

      name: z.string(),

      type: z.enum([
        'box',
        'sphere',
        'cylinder',
        'cone',
        'torus',
        'plane'
      ]),

      position: z.tuple([
        z.number(),
        z.number(),
        z.number()
      ]),

      rotation: z.tuple([
        z.number(),
        z.number(),
        z.number()
      ]),

      scale: z.tuple([
        z.number().positive(),
        z.number().positive(),
        z.number().positive()
      ]),

      material: z.object({
        color: z.string(),
        metalness: z.number().min(0).max(1).optional(),
        roughness: z.number().min(0).max(1).optional()
      }),

      animation: z.optional(
        z.object({
          type: z.enum([
            'rotate',
            'move',
            'bounce',
            'pulse',
            'orbit',
            'open_close'
          ]),

          axis: z.enum(['x', 'y', 'z']).optional(),
          speed: z.number().optional(),
          loop: z.boolean().optional(),
          target: z.string().optional()
        })
      )
    })
  ).max(60),

  lights: z.array(z.any()).optional(),
  camera: z.any().optional()
})
```

---

# 13. Database Architecture

## profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamptz default now()
);
```

---

## projects

```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## scenes

```sql
create table scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  prompt text,
  scene_name text,
  scene_json jsonb not null,
  thumbnail_url text,
  glb_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## object_templates

```sql
create table object_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  category text,
  description text,
  tags text[] default '{}',
  scene_json jsonb not null,
  thumbnail_url text,
  popularity integer default 0,
  is_public boolean default false,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## scene_refinements

```sql
create table scene_refinements (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid references scenes(id) on delete cascade,
  user_id uuid references auth.users(id),
  instruction text not null,
  previous_scene_json jsonb,
  updated_scene_json jsonb,
  created_at timestamptz default now()
);
```

---

## animation_presets

```sql
create table animation_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  description text,
  config_json jsonb not null,
  embedding vector(1536),
  created_at timestamptz default now()
);
```

---

# 14. pgvector Retrieval Architecture

## Retrieval Flow

```text
Prompt
   ↓
Embedding Generation
   ↓
Vector Search
   ↓
Top Similar Templates
   ↓
Inject into MiniMax Prompt
```

---

## Retrieval Types

* object templates
* animation presets
* environment presets
* reusable scene fragments

---

# 15. API Modules

## Auth Module

Endpoints:

```text
GET /auth/me
```

---

## Generation Module

Endpoints:

```text
POST /generation/scene
POST /generation/repair
```

---

## Refinement Module

Endpoints:

```text
POST /refinement/scene
```

---

## Templates Module

Endpoints:

```text
GET /templates
POST /templates
GET /templates/search
POST /templates/save-from-scene
```

---

## Projects Module

Endpoints:

```text
GET /projects
POST /projects
GET /projects/:id
DELETE /projects/:id
```

---

## Scenes Module

Endpoints:

```text
GET /scenes/:id
PATCH /scenes/:id
DELETE /scenes/:id
```

---

## Vector Search Module

Endpoints:

```text
POST /vector-search/templates
POST /vector-search/animations
```

---

# 16. Security Architecture

The backend must:

* never execute AI-generated code
* validate all AI outputs
* validate all user inputs
* use DTO validation
* use JWT guards
* enforce project ownership
* enforce scene ownership
* use Supabase RLS
* sanitize prompts where needed
* use environment variables securely

---

# 17. Validation Pipeline

```text
MiniMax Output
      ↓
JSON Parse
      ↓
Zod Validation
      ↓
Semantic Validation
      ↓
Repair Flow if Needed
      ↓
Approved Scene
```

---

# 18. Observability & Monitoring

## Logging

Track:

* generation requests
* validation failures
* refinement requests
* MiniMax latency
* vector retrieval latency
* export operations
* storage uploads

Recommended tools:

* Pino
* Winston
* OpenTelemetry

---

# 19. Scalability Architecture

## Future Improvements

* Redis caching
* queue-based generation
* worker-based exports
* background embedding generation
* CDN-backed storage
* multi-agent orchestration
* distributed retrieval

Recommended future tools:

* BullMQ
* Redis
* Temporal
* LangGraph

---

# 20. DevOps Architecture

## Frontend Hosting

* Vercel

## Backend Hosting

* Railway
* Render
* Fly.io

## Database Hosting

* Supabase Cloud

## CI/CD

* GitHub Actions
* pnpm monorepo

---

# 21. Environment Variables

```env
PORT=4000

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MINIMAX_API_KEY=
MINIMAX_BASE_URL=
MINIMAX_MODEL=

JWT_SECRET=
```

---

# 22. Recommended Build Order

## Phase 1

* NestJS setup
* MiniMax service
* generation endpoint
* validation pipeline
* frontend integration

---

## Phase 2

* Supabase integration
* projects
* scenes
* scene persistence
* refinement pipeline

---

## Phase 3

* object templates
* pgvector retrieval
* RAG architecture
* reusable scene memory

---

## Phase 4

* animation presets
* procedural animation metadata
* advanced refinement
* export metadata pipeline

---

# 23. Final Architecture Summary

MiniMesh AI backend is a modular AI orchestration platform.

The architecture combines:

* NestJS for scalable backend architecture
* Supabase for auth, database, and storage
* PostgreSQL + pgvector for semantic retrieval
* MiniMax as the core scene reasoning engine
* Zod for validation-safe generation
* RAG-style reusable 3D asset memory
* structured scene generation
* procedural animation support

The backend acts as the safe orchestration layer between:

* natural language prompts
* AI scene reasoning
* semantic memory retrieval
* structured validation
* frontend rendering
* persistent 3D scene management
