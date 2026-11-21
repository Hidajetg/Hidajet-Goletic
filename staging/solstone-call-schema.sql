-- Staging-only WebRTC signaling schema. Never apply to production without
-- independent auth/security review and real-device tests.
begin;
create table if not exists public.solstone_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id bigint not null references public.workers(id) on delete restrict,
  callee_id bigint not null references public.workers(id) on delete restrict,
  status text not null default 'ringing'
    check (status in ('ringing','accepted','declined','ended','missed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  answered_at timestamptz,
  ended_at timestamptz,
  caller_seen_at timestamptz not null default now(),
  callee_seen_at timestamptz not null default now(),
  constraint solstone_calls_distinct_participants check (caller_id <> callee_id)
);
create index if not exists solstone_calls_caller_idx
  on public.solstone_calls(caller_id,created_at desc);
create index if not exists solstone_calls_callee_idx
  on public.solstone_calls(callee_id,created_at desc);
create index if not exists solstone_calls_active_idx
  on public.solstone_calls(status,expires_at) where status in ('ringing','accepted');

create table if not exists public.solstone_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.solstone_calls(id) on delete cascade,
  sender_id bigint not null references public.workers(id) on delete restrict,
  kind text not null check (kind in ('offer','answer','candidate')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists solstone_call_signals_poll_idx
  on public.solstone_call_signals(call_id,id);
create unique index if not exists solstone_call_one_offer_answer
  on public.solstone_call_signals(call_id,kind)
  where kind in ('offer','answer');

alter table public.solstone_calls enable row level security;
alter table public.solstone_call_signals enable row level security;
revoke all privileges on public.solstone_calls,public.solstone_call_signals
  from public,anon,authenticated;
grant select,insert,update,delete on
  public.solstone_calls,public.solstone_call_signals to service_role;
grant usage,select on sequence public.solstone_call_signals_id_seq to service_role;
commit;
