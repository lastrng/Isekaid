create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"version":1,"values":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_backups_payload_size check (octet_length(payload::text) <= 2000000)
);
alter table public.user_backups enable row level security;
create policy "user_backups_select_own" on public.user_backups for select to authenticated using (auth.uid()=user_id);
create policy "user_backups_insert_own" on public.user_backups for insert to authenticated with check (auth.uid()=user_id);
create policy "user_backups_update_own" on public.user_backups for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
revoke all on public.user_backups from anon;
grant select,insert,update on public.user_backups to authenticated;
