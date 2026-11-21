-- Run only in isolated CI/staging after solstone-team-chat-schema.sql.
-- Keep subscriptions server-only. No API/RLS exposure to browser keys.
begin;
create table if not exists public.solstone_chat_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  worker_id bigint not null references public.workers(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) between 50 and 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists solstone_chat_push_worker_idx
  on public.solstone_chat_push_subscriptions(worker_id);
alter table public.solstone_chat_push_subscriptions enable row level security;
revoke all privileges on table public.solstone_chat_push_subscriptions
  from public, anon, authenticated;
grant select, insert, update, delete on table
  public.solstone_chat_push_subscriptions to service_role;
commit;
