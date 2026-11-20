-- Solstone Team Chat: STAGING-ONLY migration.
-- DO NOT execute this against the existing production Supabase project until
-- an isolated test database and role/permission reviews have been completed.
-- The existing web app, its tables, and its RLS rules are intentionally untouched.

begin;

create extension if not exists pgcrypto;

create table if not exists public.solstone_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('private','site','announcements')),
  site_id bigint references public.baustellen(id) on delete restrict,
  private_pair text,
  created_by bigint not null references public.workers(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint solstone_chat_room_shape check (
    (kind = 'private' and site_id is null and private_pair is not null) or
    (kind = 'site' and site_id is not null and private_pair is null) or
    (kind = 'announcements' and site_id is null and private_pair is null)
  )
);

create unique index if not exists solstone_chat_one_per_site
  on public.solstone_chat_rooms(site_id) where kind = 'site';
create unique index if not exists solstone_chat_one_announcements
  on public.solstone_chat_rooms(kind) where kind = 'announcements';
create unique index if not exists solstone_chat_private_pair_unique
  on public.solstone_chat_rooms(private_pair) where kind = 'private';

create table if not exists public.solstone_chat_members (
  room_id uuid not null references public.solstone_chat_rooms(id) on delete cascade,
  worker_id bigint not null references public.workers(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, worker_id)
);
create index if not exists solstone_chat_members_worker_id
  on public.solstone_chat_members(worker_id);

create table if not exists public.solstone_chat_pending_uploads (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.solstone_chat_rooms(id) on delete cascade,
  worker_id bigint not null references public.workers(id) on delete cascade,
  object_path text not null unique,
  original_name text not null,
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  kind text not null check (kind in ('image','pdf','voice')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists solstone_chat_pending_uploads_worker_idx
  on public.solstone_chat_pending_uploads(worker_id, created_at desc);

create table if not exists public.solstone_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.solstone_chat_rooms(id) on delete cascade,
  sender_id bigint not null references public.workers(id) on delete restrict,
  body text not null default '' check (length(body) <= 4000),
  upload_id uuid unique references public.solstone_chat_pending_uploads(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint solstone_chat_nonempty check (length(btrim(body)) > 0 or upload_id is not null)
);
create index if not exists solstone_chat_messages_room_idx
  on public.solstone_chat_messages(room_id, created_at desc, id);

create table if not exists public.solstone_chat_translations (
  message_id uuid not null references public.solstone_chat_messages(id) on delete cascade,
  target_lang text not null check (target_lang in ('de','ba','uz','cz','en')),
  translated_text text not null check (length(translated_text) <= 8000),
  provider text not null default 'openai',
  created_at timestamptz not null default now(),
  primary key (message_id, target_lang)
);

-- Server-only access. Unlike the legacy tables, the chat is never readable
-- through Supabase's anonymous/authenticated Data API. The Next.js server
-- validates the signed PIN session and current worker/site membership.
alter table public.solstone_chat_rooms enable row level security;
alter table public.solstone_chat_members enable row level security;
alter table public.solstone_chat_messages enable row level security;
alter table public.solstone_chat_pending_uploads enable row level security;
alter table public.solstone_chat_translations enable row level security;

revoke all privileges on table
  public.solstone_chat_rooms,
  public.solstone_chat_members,
  public.solstone_chat_messages,
  public.solstone_chat_pending_uploads,
  public.solstone_chat_translations
from public, anon, authenticated;

grant select, insert, update, delete on table
  public.solstone_chat_rooms,
  public.solstone_chat_members,
  public.solstone_chat_messages,
  public.solstone_chat_pending_uploads,
  public.solstone_chat_translations
to service_role;

-- The private Storage bucket is NOT public and has no client-facing SELECT
-- policies. Uploads are only possible using short-lived signed upload tokens
-- minted for one object path after the server checks chat authorization.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solstone-team-chat', 'solstone-team-chat', false, 20971520,
  array['image/jpeg','image/png','image/webp','application/pdf',
        'audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/x-wav']
)
on conflict (id) do nothing;

commit;
