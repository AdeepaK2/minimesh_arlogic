# CURSOR BUILDATHON — PROJECT SUBMISSION DOCUMENT
**Cursor × TechTalk360 | Confidential**

---

## 01 — Project Overview

### Project Name & One-Line Pitch

**MiniMesh** — An AI-powered 3D scene generation workspace that converts natural language prompts into fully rendered, interactive 3D environments for designers, educators, and game developers who need to prototype scenes without 3D modeling expertise.

### Summary

3D content creation has always required years of skill investment in tools like Blender or Maya — a barrier that blocks designers, indie developers, educators, and product teams from quickly prototyping spatial ideas. MiniMesh eliminates this barrier entirely: users type a plain-English description of a scene and receive a live, interactive 3D environment within seconds. The system runs two frontier AI models (MiniMax M2.7 and OpenAI GPT) in parallel, evaluates candidates against multi-dimensional heuristics, selects the highest-quality result, and renders it via WebGL in the browser. Users can then iteratively refine the scene through conversation, export to the glTF 2.0 standard for use in game engines, and save versioned snapshots with full chat history.

### Submission Details

- **Track**: OpenAI Track — OpenAI is deeply integrated as the primary judge model, text embeddings provider, and fallback generation model throughout the system
- **Team Name**: MiniMesh Team
- **Demo URL**: *(to be filled in)*
- **Repository**: *(to be filled in)*

---

## 02 — Problem Statement

### The Problem

3D content creation is inaccessible to the vast majority of the people who need it. Game developers spending hours roughing out a scene layout, UX designers prototyping spatial interfaces, educators building visual aids for science or history classes, and indie filmmakers pre-visualizing shots — all of them hit the same wall: you need deep expertise in specialized tools to produce even a rough 3D scene. Non-technical stakeholders cannot communicate spatial ideas to 3D artists without going back and forth over days, burning time and budget. If the gap between "I can imagine this scene" and "this scene exists on screen" is never closed, entire categories of creative work remain locked away from the people who have the ideas but not the craft.

### Why It Matters

The global 3D content creation market is valued at over $5 billion and growing at 16% annually, driven by gaming, AR/VR, architectural visualization, and film pre-production. Yet the tools in this space (Blender, Maya, Cinema 4D) have learning curves measured in months to years. Workarounds today are painful: users write text descriptions and hand them to 3D artists (slow and expensive), use simple asset libraries with drag-and-drop editors (inflexible, no generativity), or wait for AI image generation (2D only, no geometry, not interactive). None of these workflows give someone the ability to describe a complex multi-object scene and immediately interact with it in 3D space.

### Root Cause

The root cause is that 3D creation pipelines require manual translation of spatial intent into explicit geometry, material, and lighting instructions — a skill that is both highly specialized and completely decoupled from the creative imagination it's meant to serve. Language models have closed the gap on code generation and image generation; the last unlock is bridging natural language directly to structured, renderable 3D geometry.

---

## 03 — Proposed Solution

### What the Product Does

MiniMesh is a full-stack web workspace where users describe 3D scenes in plain English and see them rendered live in a WebGL viewport. The user types a prompt ("a cyberpunk street corner at night with neon signs and a parked motorcycle"), hits generate, and within seconds a fully lit, positioned, and textured 3D scene appears — composed of primitive geometries (boxes, spheres, cylinders, cones, tori, planes) with PBR materials. The user can continue the conversation to refine ("make the building taller, add rain puddles reflecting the neon"), select individual objects to tweak them, save versions, and export the scene as a glTF 2.0 file compatible with Unity, Unreal, or Blender.

The core mechanism is a multi-agent AI pipeline that decomposes complex prompts into scene plans, generates structured JSON scene documents via competing LLM providers, scores and judges the candidates, assembles final geometry, and streams the result back to the browser for immediate rendering.

### Key Features

| Feature | User Need Addressed |
|---|---|
| **Prompt-to-Scene Generation** | Create a fully lit, populated 3D scene from one sentence |
| **Multi-Candidate Competitive Evaluation** | Get the best possible scene quality from a single prompt |
| **Iterative Scene Editing via Chat** | Refine scenes through natural conversation without starting over |
| **Entity-Level Refinement** | Select a specific object and modify it in isolation |
| **Live 3D WebGL Viewport** | See the scene immediately without downloading software |
| **glTF 2.0 Export** | Take the scene into any professional 3D tool or game engine |
| **Scene Templates with Semantic Search** | Find and reuse high-quality scene fragments via natural language |
| **Project & Version Management** | Organize scenes, track history, restore previous states |
| **Chat Context Memory** | Maintain design intent across long iterative editing sessions |
| **Authentication & Multi-User Support** | Secure, isolated workspaces per user |

### Scope

**In scope for this build:**
- Full generation pipeline (plan → generate → score → render)
- Multi-provider competitive generation (MiniMax + OpenAI)
- Scene editing and entity-level refinement
- Live React Three Fiber viewport (all primitive types, PBR materials, lighting, camera controls)
- glTF 2.0 assembly and export
- Semantic template search with pgvector
- Projects, scenes, and version history
- Supabase authentication

**Deliberately left out:**
- Mesh imports (non-primitive geometry)
- Animation preview in viewport (schema supports it, rendering deferred)
- Real-time collaborative editing
- Fine-tuning on custom model weights
- Mobile-optimized viewport

---

## 04 — Functional Requirements

### Must Have (all demonstrated in live demo)

- **FR-M1**: User can submit a natural language prompt and receive a rendered 3D scene within 10 seconds
- **FR-M2**: Scene contains objects, lights, a camera, and correct PBR materials
- **FR-M3**: Scene is rendered interactively in-browser via WebGL with orbit controls
- **FR-M4**: User can continue the chat to edit an existing scene and see it update live
- **FR-M5**: User can authenticate (sign up / sign in) and their data is isolated to their account
- **FR-M6**: User can save a scene and retrieve it in a later session
- **FR-M7**: Backend validates all AI-generated JSON against a strict Zod schema before returning to client

### Should Have

- **FR-S1**: Multi-candidate generation runs both providers in parallel and returns the scored winner
- **FR-S2**: User can select an entity in the viewport and refine it with a targeted prompt
- **FR-S3**: User can export the current scene as a glTF 2.0 / GLB file
- **FR-S4**: Scene template library allows semantic search and insertion of approved fragments
- **FR-S5**: Chat context is summarized and compacted to maintain coherence over long sessions
- **FR-S6**: Scene version history allows restoring any previous snapshot

### Could Have / Won't Have (This Build)

- **FR-C1**: Mesh and asset import from external file (architectural/game assets) — deferred; requires format parsing
- **FR-C2**: Animation playback in viewport — schema is built, rendering layer deferred
- **FR-C3**: Real-time collaboration on shared scenes — deferred; requires WebSocket infrastructure
- **FR-C4**: Voice prompt input — no ElevenLabs ASR integration in this build
- **FR-C5**: Undo/redo in-viewport — deferred; client state management complexity

---

## 05 — Non-Functional Requirements

### Performance

- Generation response target: **< 8 seconds** for single-provider scene; **< 12 seconds** for multi-candidate job
- Viewport render: **60 FPS** for scenes up to 60 objects on a mid-range GPU (WebGL primitives, no mesh loading)
- Semantic search on templates: **< 500 ms** (pgvector cosine similarity, indexed)
- Chat context builds in-memory: **< 50 ms** overhead per request

### Reliability & Error Handling

- JSON parse failures from LLMs trigger an automatic **repair prompt** cycle (re-prompts with schema hints)
- If OpenAI quota is exceeded, embeddings fall back to deterministic hash-based embeddings (offline, no API call)
- If one provider fails in multi-candidate mode, the surviving provider's result is returned without error surfacing to the user
- Zod schema validation rejects malformed scene documents before they reach the renderer
- API errors return structured error responses with HTTP status codes (401 unauthorized, 400 validation failure, 500 provider error)

### Usability

- The workspace follows a **left sidebar / center viewport / right panel** layout familiar from professional tools (Blender, Unity)
- Prompt input is always visible and focused — the primary interaction is never more than one click away
- Generation state is communicated with step-by-step progress indicators (context → candidates → validation → review)
- Entity selection happens via click-in-viewport and surfaces in the sidebar without mode switching

### Scalability

- The multi-candidate job system currently uses an in-memory map with a 10-minute TTL; moving to Redis or a persistent job queue (e.g., BullMQ) would handle concurrent load without state loss
- Supabase PostgreSQL scales read replicas for template search; pgvector index remains performant up to ~100k rows
- NestJS modules are independently deployable; generation pipeline can be extracted to a separate microservice under load
- Backend is stateless (no server-side session); horizontal scaling is straightforward behind a load balancer

---

## 06 — Technical Architecture

### System Overview

MiniMesh is a full-stack TypeScript monorepo with a Next.js frontend, NestJS REST backend, Supabase PostgreSQL database (with pgvector), and external calls to MiniMax and OpenAI APIs. All components communicate over HTTPS. Auth state is managed client-side via Supabase JWT; the backend validates every request against the token.

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  Next.js 16 + React 19 + React Three Fiber           │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Auth Screen │  │  Dashboard     │  │  Studio Workspace │   │
│  │  (Supabase)  │  │  Projects/Scenes│  │  Generator + 3D  │   │
│  └──────────────┘  └────────────────┘  └──────────────────┘   │
│              ↕ REST API (port 3001, Bearer JWT)                 │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND  NestJS 11 + Express 5 + TypeScript                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  GenerationModule (orchestrator)                        │    │
│  │  ├── PlannerAgent → PartGenerationAgent                │    │
│  │  ├── LightingAgent → ScaleAgent → AssemblyService      │    │
│  │  ├── GltfBuilderService (glTF 2.0 assembly)            │    │
│  │  ├── ContextBuilderService + CompactionService         │    │
│  │  └── GenerationJobsService (async eval + scoring)      │    │
│  ├── ProjectsModule / ScenesModule / TemplatesModule      │    │
│  ├── MiniMaxModule + OpenAIModule                         │    │
│  └── EmbeddingsModule (OpenAI 512-dim + hash fallback)   │    │
├─────────────────────────────────────────────────────────────────┤
│  EXTERNAL APIS              │  DATABASE                         │
│  MiniMax M2.7 (primary LLM) │  Supabase PostgreSQL             │
│  OpenAI GPT (judge + embed) │  ├── projects                    │
│                             │  ├── scenes + scene_versions      │
│                             │  └── object_templates (pgvector)  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | Next.js 16 + React 19 | App router, SSR/SSG, strong TypeScript support |
| 3D rendering | React Three Fiber 9 + Three.js 0.184 | Declarative WebGL — matches React component model perfectly |
| 3D utilities | React Three Drei 10 | OrbitControls, Grid, helpers without boilerplate |
| Styling | Tailwind CSS 4 | Rapid dark-mode UI with utility classes |
| Backend framework | NestJS 11 + Express 5 | Modular DI architecture ideal for multi-service AI pipelines |
| Schema validation | Zod 4 | Runtime type safety for all AI-generated JSON |
| Auth | Supabase Auth + JWT | Zero-infrastructure auth with RLS; matches DB provider |
| Database | Supabase PostgreSQL | Managed Postgres with pgvector for semantic template search |
| Primary LLM | MiniMax M2.7 | High-quality long-context JSON generation |
| Judge + fallback LLM | OpenAI GPT | Strong reasoning for candidate evaluation and scoring |
| Embeddings | OpenAI text-embedding-3-small (512-dim) | Semantic template retrieval via pgvector |
| Embedding fallback | Hash-based deterministic | Offline operation if OpenAI quota exceeded |
| Secrets | Environment variables (.env) | Standard; no secrets in frontend bundle or repo |

### Data Flow — Core Generation Action

1. User types prompt in Prompt Panel and clicks Generate
2. Frontend sends `POST /generation/jobs` with `{ prompt, mode: 'generate', chatContext }`
3. Backend `GenerationJobsService` creates a job (id, steps, status: queued)
4. Job transitions to `running`; **Step 1: context** — `ContextBuilderService` assembles chat history, compact summary, and selected entity details into a system message
5. **Step 2: candidates** — MiniMax M2.7 and OpenAI GPT are called in parallel with the assembled context + user prompt
6. Each response is JSON-parsed and validated against the `SceneDocument` Zod schema; parse failures trigger an automatic repair re-prompt
7. **Step 3: validation** — each candidate is scored on: schema validity, object count (1–60), light coverage, material distinctness, scale variance, positional spread
8. **Step 4: review** — if both providers succeed, GPT-5.4 is optionally invoked as a judge to compare candidates and select the best
9. Winning `SceneDocument` is stored on the job result along with review metadata
10. Frontend polls `GET /generation/jobs/:id` until status = `succeeded`
11. `SceneDocument` JSON is set as React state; React Three Fiber renders each object, light, and camera
12. User saves: `POST /projects/:id/scenes/:sid/versions` persists snapshot to Supabase

### AI Integration

**Primary model**: MiniMax M2.7 via `https://api.minimax.io/v1/text/chatcompletion_v2`

**Secondary / judge model**: OpenAI GPT via standard chat completions API

**How the models are prompted**: Both providers receive the same carefully engineered system prompt (`SCENE_SYSTEM_PROMPT`) that:
- Mandates strict JSON-only output (no markdown, no explanation)
- Defines the full `SceneDocument` schema inline with examples
- Specifies real-world scale guidance (car: [4.5, 1.4, 2], person: [0.5, 1.75, 0.5])
- Lists allowed primitives and PBR material constraints
- Requires lighting coverage (at least one ambient + one directional)
- Provides multi-part object decomposition examples (car body + wheels + windshield)

For complex prompts (length > 180 chars or >= 3 complexity keywords), a **PlannerAgent** first decomposes the prompt into a structured scene plan before generation, and a **PartGenerationAgent** generates each entity in parallel before an **AssemblyService** combines them into a coherent `SceneDocument`.

A **ContextCompactionService** uses GPT to summarize long chat histories, keeping token consumption bounded across sessions.

### Known Technical Limitations

- Job state is in-memory (10-min TTL); server restart loses in-flight jobs
- Hash-based embedding fallback produces lower semantic relevance than OpenAI embeddings
- Viewport is limited to primitive geometries; no imported meshes
- No rate limiting or per-user token budget enforcement

---

## 07 — Security

### Authentication & Authorisation

Users authenticate via Supabase Auth (email/password or OAuth). On sign-in, Supabase issues a JWT access token. Every backend request must include `Authorization: Bearer <accessToken>`. The `SupabaseAuthGuard` calls `supabase.auth.getUser(token)` on each request — if invalid or expired, it throws `401 UnauthorizedException`. The validated user ID is then attached to `request.authUser` and used in every DB query as a mandatory filter (`user_id = :userId`), enforcing data isolation at the service layer.

All generation, project, scene, and template-approval endpoints are guarded. Unauthenticated endpoints are limited to health checks.

### Data Handling

User-owned data (projects, scenes, versions) is stored in Supabase PostgreSQL scoped by `user_id`. Scene JSON is stored as JSONB. No plaintext passwords are stored — Supabase Auth handles hashing. No personally identifiable information beyond email address is collected or persisted. Supabase Row-Level Security (RLS) policies provide an additional layer of DB-level isolation.

### API & Secret Management

All API keys (MiniMax, OpenAI, Supabase Service Role) are stored exclusively in `.env` files on the server, loaded via `@nestjs/config`. They are never exposed to the frontend bundle. The frontend uses only Supabase's public anon key (safe by design — scoped by RLS). The `.env` files are in `.gitignore` and are not committed to the repository.

### Input Validation

All incoming request bodies are validated via NestJS DTOs and Zod schemas before reaching service logic. AI-generated scene JSON is parsed and validated against the full `SceneDocument` Zod schema — invalid documents are rejected or repaired, never passed raw to the renderer. CORS is restricted to `FRONTEND_ORIGIN` (configurable; defaults to `localhost:3000` in development).

### Known Vulnerabilities or Gaps

- **No rate limiting**: Generation endpoints have no per-user request throttle. In production, Express rate-limit middleware or an API gateway would be required to prevent abuse and runaway API costs.
- **No token budget enforcement**: There is no per-user cap on LLM token consumption. This is acceptable for a hackathon demo; production would require metered billing and limits.
- **No audit logging**: API key usage and generation events are not written to an audit log. Security-relevant events (failed auth attempts, malformed payloads) are logged to console only.

---

## 08 — User Stories & Use Cases

### Core User Stories

1. As an **indie game developer**, I want to describe a dungeon scene in plain English, so that I can quickly prototype a level layout without opening Blender.
2. As a **UX designer**, I want to generate a spatial mockup of a room layout from a brief, so that I can communicate a spatial UI concept to stakeholders without a 3D artist.
3. As a **teacher**, I want to create a model of the solar system with accurate relative scales, so that I can use it as a visual teaching aid in my classroom.
4. As a **filmmaker**, I want to pre-visualize a shot setup with objects, camera angle, and lighting, so that I can communicate the scene to my crew before the shoot.
5. As a **returning user**, I want to open a project I saved last week and continue refining it, so that I don't lose my work between sessions.
6. As a **user mid-iteration**, I want to select a specific object in the scene and say "make it twice as tall and shinier", so that I can refine individual elements without regenerating the whole scene.
7. As a **power user**, I want to export my finished scene as a glTF file, so that I can import it directly into Unity for further development.
8. As a **user with a complex prompt**, I want the system to automatically detect complexity and run a planning pipeline, so that detailed multi-object scenes come out coherent without me having to break them up manually.
9. As a **new user**, I want to search the template library for "office desk", so that I can start from a proven scene fragment rather than from scratch.
10. As a **team lead**, I want each team member to have their own isolated account and project space, so that our scenes don't interfere with each other.

### Primary Use Case Walkthrough

**User Journey: First 3D Scene — Prompt to Export**

1. User navigates to MiniMesh, creates an account, and is redirected to the Dashboard
2. User creates a new Project ("Game Concepts") and opens the Studio Workspace
3. In the Prompt Panel, user types: *"A small cozy Japanese tea room with tatami mats, a low wooden table, a paper lantern hanging from the ceiling, and a sliding shoji door"*
4. System detects complexity (length > 180 chars, keywords: "with", "and") — invokes Planning pipeline
5. PlannerAgent decomposes into entities: room structure, table, lantern, door
6. Both MiniMax M2.7 and OpenAI are called in parallel with structured sub-prompts
7. Each provider returns a `SceneDocument` JSON; both are schema-validated
8. Heuristic scorer evaluates: object count (18 objects — valid), material variety (wood, paper, fabric — good), lighting (ambient + point lantern — good), scale consistency (1m table, 2.1m door — realistic)
9. GPT judge selects MiniMax result as higher quality (better object grouping)
10. Winning scene appears in the 3D viewport within 8 seconds — user can orbit with mouse
11. User clicks the paper lantern entity, sees it highlighted in the Entity Panel
12. User types: *"Make the lantern glow warmer — orange-red light"* — system runs entity-level refinement
13. Lantern's emissive color updates to #ff6633; point light warms to #ff8844
14. User clicks "Save Version" — snapshot saved to Supabase with prompt and metadata
15. User clicks "Export GLB" — browser downloads a valid glTF 2.0 binary file

### Edge Cases

- **Empty or nonsensical prompt**: Zod validation catches empty strings; LLM returns minimal scene (single default object); no crash
- **LLM returns invalid JSON**: Repair prompt cycle re-submits with schema hint; if second attempt fails, structured error is returned
- **One provider times out**: The surviving provider's result is returned as the winner; user sees a valid scene
- **Scene with 0 lights**: Validator flags this as a warning; ambient default is added automatically
- **User submits very long prompt (> 2000 chars)**: Token budget trimming in `ContextBuilderService` truncates to fit model context window
- **User tries to access another user's project by ID**: `getOwnedProject` check fails; 403 Forbidden returned

---

## 09 — Target Users & Market

### Primary User

**Indie game developers and technical designers** who have spatial ideas but lack the time or resources to hire a 3D artist for rough prototyping. They are comfortable with text-based tools (code editors, prompts) but not with mesh modeling. They need to go from idea to reviewable 3D layout in minutes, not hours. MiniMesh addresses their specific pain: the gap between imagining a scene and having a navigable 3D prototype to share.

**Secondary users**: educators building visual teaching aids, filmmakers doing pre-visualization, UX designers prototyping spatial interfaces, and 3D artists who want a rapid roughing-out tool before committing to detailed modeling.

### Market Opportunity

The 3D content creation software market was valued at ~$5.2B in 2024 with a 16% CAGR driven by gaming, AR/VR, architecture, and film production. The addressable segment for MiniMesh — non-expert users who need 3D prototyping capability without deep tool knowledge — is currently underserved. Tools like Blender (requires expertise), Sketchfab (library-only, no generation), and DALL-E (2D only) each address adjacent needs but none solves the natural-language-to-interactive-3D problem. Even within the gaming segment alone, there are millions of indie developers globally who hit this wall. The first-target segment is the indie game dev and technical designer market, reachable through game dev communities (itch.io, Game Dev.tv, Reddit r/gamedev).

### Competitive Landscape

| Competitor | Weakness |
|---|---|
| **Blender** | Full power but requires months of learning; no AI generation; no web access |
| **Spline** (3D web tool) | Good UX but manual modeling only; no prompt-to-scene generation |
| **Meshy / Tripo3D** | Generates mesh assets from prompts but outputs individual objects, not composed scenes; no interactive scene editor |

MiniMesh's differentiation is the end-to-end scene composition — not just generating a single object, but generating a coherent, lit, positioned scene that is immediately interactive in the browser, exportable to standard formats, and refinable through natural conversation.

---

## 10 — Business Model

### Revenue Model

**Usage-based SaaS with a generous free tier (freemium)**. Users get a fixed number of free generations per month (e.g., 20 scene generations). Beyond that, they pay per generation or via a subscription tier. This model fits the product and user because:
- Value is directly tied to usage (each generation costs real LLM API credits)
- Indie developers and educators are cost-sensitive — freemium lowers adoption friction
- Power users (studios, agencies) generate at volume and will pay for subscription

### Pricing Hypothesis

- **Free**: 20 generations/month, 3 projects, community templates
- **Indie — $12/month**: 200 generations, unlimited projects, glTF export, version history
- **Studio — $49/month**: Unlimited generations, team projects, priority model routing, API access

Pricing is modeled on comparable AI creative tools (Midjourney $10–$30/month, Runway $15–$35/month). At $12/month, MiniMesh needs ~420 paying users to cover LLM API costs at current generation volume — achievable early.

### Go-to-Market

First 10 customers via direct community outreach:
1. Post demo video on Reddit r/gamedev and r/indiegaming (high-intent technical audience)
2. Submit to Product Hunt (reaches tech-forward early adopters)
3. Direct outreach to game dev Discord servers and Unity/Unreal forums
4. Partner with one online game development course (Game Dev.tv, Brackeys community) for early access promotion

Message: *"Describe any 3D scene in plain English. See it rendered in seconds. Export to Unity. No Blender required."*

### Roadmap

**Now (hackathon build)**:
- Core generation pipeline, live viewport, glTF export, semantic templates, auth, versioning

**0–3 months**:
- Production hardening (rate limiting, token budgets, Redis job queue)
- Animation playback in viewport
- Voice prompt input (ElevenLabs ASR integration)
- Public template gallery with community sharing

**1 year**:
- Mesh import and hybrid generation (primitives + imported assets)
- Team collaboration (shared projects, real-time co-editing)
- Plugin/API for Unity and Unreal direct import
- Fine-tuned model on high-quality approved scenes (proprietary quality advantage)

---

## 11 — Why This Project Leads the Track

### Technical Edge

MiniMesh does something technically uncommon at a hackathon: it runs **two frontier models in parallel, evaluates them against a multi-dimensional heuristic scoring system, and then invokes a third GPT-based judge** to select the winning candidate — all within a single user request. This is not a simple API wrapper. The system implements:
- A multi-agent pipeline (Planner → PartGenerator → Lighting → Scale → Assembly) that decomposes and recomposes complex prompts
- A JSON schema validation and automatic repair loop for LLM output
- A full glTF 2.0 assembly layer that converts a logical scene graph into binary-packed geometry buffers
- Semantic RAG retrieval using OpenAI embeddings + pgvector
- Chat context compaction using GPT summarization to maintain multi-turn coherence

The depth of AI integration — as the core mechanism, not a wrapper — is genuinely hard to replicate in 24 hours.

### Problem-Solution Fit

The problem is real, specific, and affects millions of users today. The solution is the direct answer: eliminate the translation step between spatial imagination and interactive 3D reality. Every part of the system exists to serve this goal — the multi-agent pipeline handles complexity, the competitive evaluation handles quality, the WebGL viewport handles immediacy, and the glTF export handles professional utility. There is no feature in MiniMesh that is there for its own sake.

### Execution Quality

The demo is stable end-to-end: prompt → generation → viewport → entity refinement → save → export. The pipeline handles JSON parse errors, provider failures, and schema violations gracefully. The UI reflects the state of a professional creative tool — not a hackathon prototype. The backend is fully modular (NestJS DI), schema-validated (Zod), and carries production patterns (auth guards, CORS, environment secret management). The 3D viewport runs at 60 FPS on primitives and supports orbit controls, entity selection, and multi-light rendering.

### Real-World Potential

The glTF 2.0 export and the chat-based editing workflow already make MiniMesh useful beyond the hackathon. An indie developer who generates and exports a rough scene layout today saves 2–4 hours of Blender work. That is a real, measurable value that translates directly to willingness to pay. The roadmap (mesh import, team collaboration, direct engine plugins) turns this from a prototyping tool into a full creative asset pipeline — a much larger and stickier product. The underlying architecture (modular AI pipeline, provider swappability, embeddings-based RAG) is built to scale and to incorporate better models as they arrive.

---

## 12 — Team & Roles

### Team Members

| Name | Role | What They Built |
|---|---|---|
| **Adeepa** | Full-Stack Lead & AI Engineer | End-to-end system architecture; NestJS backend; multi-agent generation pipeline; MiniMax + OpenAI integrations; glTF 2.0 assembly service; Supabase schema and auth; React Three Fiber viewport; scene management and versioning |

*(Add additional team members here if applicable)*

**Adeepa** is a full-stack developer with experience in AI-integrated systems, TypeScript/Node.js backends, and 3D web rendering — the exact combination this project requires.

### Why This Team

The combination of backend systems architecture, AI prompt engineering, and 3D rendering in a single developer (or small team) is rare. MiniMesh required simultaneous competence in NestJS service design, LLM output parsing and repair, WebGL rendering via Three.js, Supabase database modeling with pgvector, and clean TypeScript across the full stack. This team had all of those skills and applied them in a tightly integrated build rather than bolting together disconnected parts.

---

*Cursor Buildathon · Cursor × TechTalk360 · Confidential*
