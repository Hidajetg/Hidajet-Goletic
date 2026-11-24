-- Keep employee identity and history; only remove a deactivated account from the current staff list.
alter table public.workers add column if not exists archived_at timestamptz;
alter table public.workers add constraint workers_archived_inactive check (archived_at is null or active is false);
-- Existing read-only lookups still need historical names. All staff changes
-- go through the server-side administrator API, not browser-side mutations.
alter table public.workers enable row level security;
create policy workers_read_existing_directory on public.workers for select to anon, authenticated using (true);
revoke insert, update, delete, truncate, trigger, references on table public.workers from anon, authenticated;
