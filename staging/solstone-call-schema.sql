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


-- Both workers share a single-user "busy" constraint. Two simultaneous
-- requests for the same worker are serialized with advisory transaction locks,
-- then checked across BOTH caller/callee columns. No paid coordination server.
create or replace function public.solstone_calls_prevent_overlap()
returns trigger language plpgsql set search_path=pg_catalog,public as $solstone_busy$
begin
  if new.status <> 'ringing' then
    raise exception 'A new call must be ringing' using errcode='23514';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('solstone-call:' || least(new.caller_id,new.callee_id)::text, 0));
  perform pg_advisory_xact_lock(
    hashtextextended('solstone-call:' || greatest(new.caller_id,new.callee_id)::text, 0));
  if exists (
    select 1 from public.solstone_calls c
    where (
      c.caller_id in (new.caller_id,new.callee_id)
      or c.callee_id in (new.caller_id,new.callee_id)
    )
    and (c.status='accepted' or
      (c.status='ringing' and c.expires_at > now()))
  ) then
    raise exception 'Worker is already in another call' using errcode='23505';
  end if;
  return new;
end $solstone_busy$;

drop trigger if exists solstone_calls_one_active_per_worker on public.solstone_calls;
create trigger solstone_calls_one_active_per_worker
before insert on public.solstone_calls
for each row execute function public.solstone_calls_prevent_overlap();

-- Service-role access alone must not allow an unrelated worker's SDP/ICE into
-- an established conversation if a future route accidentally omits its check.
create or replace function public.solstone_call_signal_participant_only()
returns trigger language plpgsql set search_path=pg_catalog,public as $solstone_signal$
declare
  c record;
begin
  select caller_id,callee_id,status,expires_at into c
    from public.solstone_calls where id=new.call_id;
  if not found then
    raise exception 'Call not found' using errcode='23503';
  end if;
  if new.sender_id not in (c.caller_id,c.callee_id) then
    raise exception 'Not a call participant' using errcode='23514';
  end if;
  if c.status not in ('ringing','accepted') or
     (c.status='ringing' and c.expires_at <= now()) then
    raise exception 'Call is not active' using errcode='23514';
  end if;
  if (new.kind='offer' and (new.sender_id<>c.caller_id or
      new.payload->>'type' <> 'offer')) or
     (new.kind='answer' and (new.sender_id<>c.callee_id or
      c.status<>'accepted' or new.payload->>'type' <> 'answer')) then
    raise exception 'Invalid signal sender or state' using errcode='23514';
  end if;
  if length(new.payload::text)>14000 then
    raise exception 'Oversized signal' using errcode='23514';
  end if;
  return new;
end $solstone_signal$;

drop trigger if exists solstone_call_signals_participant_only
  on public.solstone_call_signals;
create trigger solstone_call_signals_participant_only
before insert on public.solstone_call_signals
for each row execute function public.solstone_call_signal_participant_only();

revoke all on function public.solstone_calls_prevent_overlap()
  from public, anon, authenticated;
revoke all on function public.solstone_call_signal_participant_only()
  from public, anon, authenticated;

alter table public.solstone_calls enable row level security;
alter table public.solstone_call_signals enable row level security;
revoke all privileges on public.solstone_calls,public.solstone_call_signals
  from public,anon,authenticated;
grant select,insert,update,delete on
  public.solstone_calls,public.solstone_call_signals to service_role;
grant usage,select on sequence public.solstone_call_signals_id_seq to service_role;
commit;
