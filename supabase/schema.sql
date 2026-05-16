create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  latest_scene_json jsonb not null,
  latest_prompt text,
  latest_version_number integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists scene_versions (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references scenes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  prompt text,
  scene_json jsonb not null,
  warnings text[] default '{}',
  created_at timestamptz default now(),
  unique(scene_id, version_number)
);

create extension if not exists vector;

create table if not exists object_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  tags text[] not null default '{}',
  scene_json_fragment jsonb not null,
  is_public boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table object_templates
  add column if not exists reference_type text not null default 'fragment'
    check (reference_type in ('fragment', 'scene')),
  add column if not exists scene_json_document jsonb,
  add column if not exists source_scene_id uuid references scenes(id) on delete set null,
  add column if not exists source_version_id uuid references scene_versions(id) on delete set null,
  add column if not exists source_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

create table if not exists template_embeddings (
  template_id uuid primary key references object_templates(id) on delete cascade,
  embedding vector(384) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table scenes
  add column if not exists project_id uuid references projects(id) on delete cascade;

alter table scenes
  add column if not exists chat_context_summary text,
  add column if not exists chat_context_updated_at timestamptz,
  add column if not exists estimated_input_tokens integer,
  add column if not exists estimated_output_tokens integer,
  add column if not exists provider_input_tokens integer,
  add column if not exists provider_output_tokens integer;

alter table scenes
  add column if not exists latest_scene_gltf jsonb;

alter table scene_versions
  add column if not exists scene_gltf jsonb;

alter table scene_versions
  add column if not exists chat_context_summary text,
  add column if not exists chat_context_updated_at timestamptz,
  add column if not exists estimated_input_tokens integer,
  add column if not exists estimated_output_tokens integer,
  add column if not exists provider_input_tokens integer,
  add column if not exists provider_output_tokens integer;

alter table profiles enable row level security;
alter table projects enable row level security;
alter table scenes enable row level security;
alter table scene_versions enable row level security;
alter table object_templates enable row level security;
alter table template_embeddings enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
  on profiles for insert
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
  on profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "projects_select_own" on projects;
create policy "projects_select_own"
  on projects for select
  using ((select auth.uid()) = user_id);

drop policy if exists "projects_insert_own" on projects;
create policy "projects_insert_own"
  on projects for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "projects_update_own" on projects;
create policy "projects_update_own"
  on projects for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "projects_delete_own" on projects;
create policy "projects_delete_own"
  on projects for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "scenes_select_own" on scenes;
create policy "scenes_select_own"
  on scenes for select
  using ((select auth.uid()) = user_id);

drop policy if exists "scenes_insert_own" on scenes;
create policy "scenes_insert_own"
  on scenes for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "scenes_update_own" on scenes;
create policy "scenes_update_own"
  on scenes for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "scenes_delete_own" on scenes;
create policy "scenes_delete_own"
  on scenes for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "scene_versions_select_own" on scene_versions;
create policy "scene_versions_select_own"
  on scene_versions for select
  using ((select auth.uid()) = user_id);

drop policy if exists "scene_versions_insert_own" on scene_versions;
create policy "scene_versions_insert_own"
  on scene_versions for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "scene_versions_delete_own" on scene_versions;
create policy "scene_versions_delete_own"
  on scene_versions for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "object_templates_select_public" on object_templates;
create policy "object_templates_select_public"
  on object_templates for select
  using (is_public = true);

drop policy if exists "template_embeddings_select_public_templates" on template_embeddings;
create policy "template_embeddings_select_public_templates"
  on template_embeddings for select
  using (
    exists (
      select 1
      from object_templates
      where object_templates.id = template_embeddings.template_id
        and object_templates.is_public = true
    )
  );

create index if not exists scenes_user_updated_idx
  on scenes (user_id, updated_at desc);

create index if not exists projects_user_updated_idx
  on projects (user_id, updated_at desc);

create index if not exists scenes_project_updated_idx
  on scenes (project_id, updated_at desc);

create index if not exists scene_versions_scene_number_idx
  on scene_versions (scene_id, version_number desc);

create unique index if not exists object_templates_name_idx
  on object_templates (name);

create index if not exists object_templates_category_idx
  on object_templates (category);

create index if not exists template_embeddings_embedding_idx
  on template_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 16);

drop function if exists match_object_templates(vector(384), integer);
create function match_object_templates(
  query_embedding vector(384),
  match_count integer default 4
)
returns table (
  id uuid,
  name text,
  category text,
  description text,
  tags text[],
  scene_json_fragment jsonb,
  reference_type text,
  scene_json_document jsonb,
  is_public boolean,
  created_at timestamptz,
  updated_at timestamptz,
  score double precision
)
language sql
stable
as $$
  select
    object_templates.id,
    object_templates.name,
    object_templates.category,
    object_templates.description,
    object_templates.tags,
    object_templates.scene_json_fragment,
    object_templates.reference_type,
    object_templates.scene_json_document,
    object_templates.is_public,
    object_templates.created_at,
    object_templates.updated_at,
    1 - (template_embeddings.embedding <=> query_embedding) as score
  from object_templates
  join template_embeddings
    on template_embeddings.template_id = object_templates.id
  where object_templates.is_public = true
  order by template_embeddings.embedding <=> query_embedding
  limit match_count;
$$;

insert into object_templates (name, category, description, tags, scene_json_fragment, is_public)
values
  (
    'Hover Sports Car',
    'vehicle',
    'Low-poly hovering sports car built from primitive body panels, wheel rings, and neon underglow.',
    array['hover','sports','car','vehicle','cyberpunk','neon'],
    '{"objects":[{"id":"hover-car-body","name":"Hover car body","type":"box","position":[0,0.7,0],"rotation":[0,0,0],"scale":[1.45,0.28,0.72],"material":{"color":"#111827","metalness":0.55,"roughness":0.28}},{"id":"hover-car-cabin","name":"Angular glass cabin","type":"box","position":[-0.15,1.02,0],"rotation":[0,0,0],"scale":[0.72,0.28,0.52],"material":{"color":"#38bdf8","metalness":0.2,"roughness":0.18}},{"id":"hover-car-front-light","name":"Front neon blade","type":"box","position":[0,0.78,0.78],"rotation":[0,0,0],"scale":[1.2,0.05,0.04],"material":{"color":"#ff2bd6","metalness":0,"roughness":0.2}},{"id":"hover-car-underglow","name":"Blue underglow panel","type":"box","position":[0,0.46,0],"rotation":[0,0,0],"scale":[1.2,0.04,0.54],"material":{"color":"#00d5ff","metalness":0,"roughness":0.18}},{"id":"hover-car-wheel-left-front","name":"Left front hover ring","type":"torus","position":[-0.85,0.55,0.48],"rotation":[1.57,0,0],"scale":[0.18,0.18,0.05],"material":{"color":"#a855f7","metalness":0.1,"roughness":0.25}},{"id":"hover-car-wheel-right-front","name":"Right front hover ring","type":"torus","position":[0.85,0.55,0.48],"rotation":[1.57,0,0],"scale":[0.18,0.18,0.05],"material":{"color":"#a855f7","metalness":0.1,"roughness":0.25}}],"lights":[{"id":"hover-car-glow","type":"point","color":"#00d5ff","intensity":1.5,"position":[0,0.55,0]}]}'::jsonb,
    true
  ),
  (
    'Reflective Wet Road',
    'environment',
    'Wide dark road plane with center lane markings for night city scenes.',
    array['road','street','wet','reflective','ground','night'],
    '{"objects":[{"id":"wet-road","name":"Reflective wet road","type":"plane","position":[0,0,0],"rotation":[-1.57,0,0],"scale":[7,10,1],"material":{"color":"#0f172a","metalness":0.25,"roughness":0.2}},{"id":"center-lane-a","name":"Neon lane mark A","type":"box","position":[0,0.02,-1.8],"rotation":[0,0,0],"scale":[0.05,0.02,0.9],"material":{"color":"#38bdf8","metalness":0,"roughness":0.3}},{"id":"center-lane-b","name":"Neon lane mark B","type":"box","position":[0,0.02,1.3],"rotation":[0,0,0],"scale":[0.05,0.02,0.9],"material":{"color":"#38bdf8","metalness":0,"roughness":0.3}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Low Poly Building Block',
    'architecture',
    'Simple stacked building blocks with bright window strips.',
    array['building','buildings','city','low-poly','block','windows'],
    '{"objects":[{"id":"building-left","name":"Left low-poly building","type":"box","position":[-3,1.4,-1.2],"rotation":[0,0.08,0],"scale":[0.85,1.4,0.85],"material":{"color":"#1f2937","metalness":0.05,"roughness":0.7}},{"id":"building-right","name":"Right low-poly building","type":"box","position":[3,1.8,-1.5],"rotation":[0,-0.08,0],"scale":[0.9,1.8,0.9],"material":{"color":"#111827","metalness":0.05,"roughness":0.75}},{"id":"window-strip-left","name":"Left neon windows","type":"box","position":[-3,1.7,-0.33],"rotation":[0,0.08,0],"scale":[0.6,0.08,0.03],"material":{"color":"#00d5ff","metalness":0,"roughness":0.25}},{"id":"window-strip-right","name":"Right neon windows","type":"box","position":[3,2.15,-0.58],"rotation":[0,-0.08,0],"scale":[0.62,0.08,0.03],"material":{"color":"#ff2bd6","metalness":0,"roughness":0.25}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Neon Sign Panel',
    'signage',
    'Bright rectangular neon sign panel for cyberpunk storefronts.',
    array['neon','sign','signs','panel','storefront','pink','blue'],
    '{"objects":[{"id":"neon-sign-panel","name":"Neon sign panel","type":"plane","position":[-2.1,2.05,0.35],"rotation":[0.1,0.25,0],"scale":[0.8,0.28,1],"material":{"color":"#ff2bd6","metalness":0,"roughness":0.2}},{"id":"neon-sign-frame","name":"Sign frame","type":"box","position":[-2.1,2.05,0.34],"rotation":[0,0.25,0],"scale":[0.9,0.36,0.04],"material":{"color":"#111827","metalness":0.4,"roughness":0.35}}],"lights":[{"id":"neon-sign-glow","type":"point","color":"#ff2bd6","intensity":1.2,"position":[-2.1,2.1,0.6]}]}'::jsonb,
    true
  ),
  (
    'Holographic Billboard',
    'signage',
    'Floating holographic billboard made of planes and a thin support.',
    array['holographic','billboard','screen','floating','purple','cyberpunk'],
    '{"objects":[{"id":"holo-billboard","name":"Holographic billboard","type":"plane","position":[2.2,2.8,-0.15],"rotation":[0.15,-0.35,0],"scale":[1.1,0.55,1],"material":{"color":"#a855f7","metalness":0,"roughness":0.18}},{"id":"holo-billboard-support","name":"Billboard support","type":"cylinder","position":[2.2,1.65,-0.22],"rotation":[0,0,0],"scale":[0.04,1.1,0.04],"material":{"color":"#64748b","metalness":0.45,"roughness":0.4}}],"lights":[{"id":"holo-billboard-glow","type":"point","color":"#a855f7","intensity":1.4,"position":[2.1,2.8,0.2]}]}'::jsonb,
    true
  ),
  (
    'Street Lamp',
    'prop',
    'Slim street lamp with a neon light head.',
    array['street','lamp','light','pole','streetlamp'],
    '{"objects":[{"id":"street-lamp-pole","name":"Street lamp pole","type":"cylinder","position":[-2.6,0.75,1.6],"rotation":[0,0,0],"scale":[0.04,0.75,0.04],"material":{"color":"#334155","metalness":0.5,"roughness":0.45}},{"id":"street-lamp-head","name":"Street lamp head","type":"sphere","position":[-2.6,1.55,1.6],"rotation":[0,0,0],"scale":[0.16,0.16,0.16],"material":{"color":"#38bdf8","metalness":0,"roughness":0.2}}],"lights":[{"id":"street-lamp-light","type":"point","color":"#38bdf8","intensity":1.25,"position":[-2.6,1.6,1.6]}]}'::jsonb,
    true
  ),
  (
    'Traffic Barrier',
    'prop',
    'Low road barrier with neon hazard bands.',
    array['traffic','barrier','roadblock','street','hazard'],
    '{"objects":[{"id":"traffic-barrier-base","name":"Traffic barrier base","type":"box","position":[1.9,0.25,1.7],"rotation":[0,-0.25,0],"scale":[0.75,0.18,0.12],"material":{"color":"#111827","metalness":0.1,"roughness":0.65}},{"id":"traffic-barrier-band","name":"Traffic barrier neon band","type":"box","position":[1.9,0.38,1.7],"rotation":[0,-0.25,0],"scale":[0.65,0.04,0.13],"material":{"color":"#facc15","metalness":0,"roughness":0.35}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Utility Pipe Cluster',
    'detail',
    'Small industrial pipe cluster for walls or sidewalks.',
    array['pipe','pipes','industrial','detail','utility'],
    '{"objects":[{"id":"pipe-a","name":"Utility pipe A","type":"cylinder","position":[-3.35,0.65,0.45],"rotation":[1.57,0,0],"scale":[0.06,0.85,0.06],"material":{"color":"#64748b","metalness":0.55,"roughness":0.38}},{"id":"pipe-b","name":"Utility pipe B","type":"cylinder","position":[-3.18,0.5,0.45],"rotation":[1.57,0,0],"scale":[0.04,0.75,0.04],"material":{"color":"#475569","metalness":0.55,"roughness":0.4}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Rooftop Antenna',
    'detail',
    'Thin rooftop antenna and receiver dish.',
    array['antenna','rooftop','roof','detail','signal'],
    '{"objects":[{"id":"antenna-mast","name":"Rooftop antenna mast","type":"cylinder","position":[3,3.78,-1.3],"rotation":[0,0,0],"scale":[0.025,0.5,0.025],"material":{"color":"#94a3b8","metalness":0.5,"roughness":0.35}},{"id":"antenna-dish","name":"Small receiver dish","type":"sphere","position":[3.12,3.95,-1.3],"rotation":[0,0,0],"scale":[0.12,0.05,0.12],"material":{"color":"#cbd5e1","metalness":0.4,"roughness":0.4}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Small Crates',
    'prop',
    'Cluster of small sidewalk crates for environmental detail.',
    array['crate','crates','box','prop','detail'],
    '{"objects":[{"id":"crate-a","name":"Small crate A","type":"box","position":[-1.8,0.2,2.3],"rotation":[0,0.2,0],"scale":[0.28,0.22,0.28],"material":{"color":"#7c2d12","metalness":0,"roughness":0.75}},{"id":"crate-b","name":"Small crate B","type":"box","position":[-1.45,0.16,2.35],"rotation":[0,-0.1,0],"scale":[0.22,0.16,0.22],"material":{"color":"#92400e","metalness":0,"roughness":0.75}}],"lights":[]}'::jsonb,
    true
  ),
  (
    'Floating Light Panels',
    'lighting',
    'Floating colored panels used as futuristic environmental lights.',
    array['floating','light','panel','panels','neon','blue','pink'],
    '{"objects":[{"id":"floating-light-panel-a","name":"Floating cyan light panel","type":"plane","position":[-1.2,2.6,1.3],"rotation":[0.4,0.4,0],"scale":[0.5,0.18,1],"material":{"color":"#00d5ff","metalness":0,"roughness":0.15}},{"id":"floating-light-panel-b","name":"Floating pink light panel","type":"plane","position":[1.4,2.35,1.1],"rotation":[0.3,-0.35,0],"scale":[0.45,0.16,1],"material":{"color":"#ff2bd6","metalness":0,"roughness":0.15}}],"lights":[{"id":"floating-panel-glow-a","type":"point","color":"#00d5ff","intensity":1,"position":[-1.2,2.6,1.3]},{"id":"floating-panel-glow-b","type":"point","color":"#ff2bd6","intensity":1,"position":[1.4,2.35,1.1]}]}'::jsonb,
    true
  )
on conflict (name) do update
set
  category = excluded.category,
  description = excluded.description,
  tags = excluded.tags,
  scene_json_fragment = excluded.scene_json_fragment,
  is_public = excluded.is_public,
  updated_at = now();
