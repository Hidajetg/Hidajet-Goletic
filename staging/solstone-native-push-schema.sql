-- Additive only. Apply to isolated staging first; no worker/client access.
begin;
create table if not exists public.solstone_native_push_devices (
  token text primary key check (length(token) between 32 and 4096),
  worker_id bigint not null references public.workers(id) on delete cascade,
  session_hash text not null check (length(session_hash)=64),
  binding text not null check (length(binding)=64),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists solstone_native_push_worker_idx
  on public.solstone_native_push_devices(worker_id, expires_at);
create index if not exists solstone_native_push_session_idx
  on public.solstone_native_push_devices(session_hash);
alter table public.solstone_native_push_devices enable row level security;
revoke all on public.solstone_native_push_devices from public, anon, authenticated;
grant select, insert, update, delete on public.solstone_native_push_devices to service_role;
commit;
