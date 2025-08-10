-- Ensure playback_state table, RLS, and policies exist and are correct
-- Safe to run multiple times

-- 1) Table
create table if not exists public.playback_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  track_id uuid references public.tracks(id),
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 2) RLS
alter table public.playback_state enable row level security;

-- 3) Policies (recreate to be deterministic)
drop policy if exists "Users can view own playback state" on public.playback_state;
drop policy if exists "Users can upsert own playback state" on public.playback_state;
drop policy if exists "Users can update own playback state" on public.playback_state;

create policy "Users can view own playback state" on public.playback_state
  for select using (auth.uid() = user_id);

create policy "Users can upsert own playback state" on public.playback_state
  for insert with check (auth.uid() = user_id);

create policy "Users can update own playback state" on public.playback_state
  for update using (auth.uid() = user_id);

-- 4) Optional trigger to auto-update updated_at on UPDATE
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_timestamp on public.playback_state;
create trigger set_timestamp before update on public.playback_state
for each row execute function public.set_updated_at();
