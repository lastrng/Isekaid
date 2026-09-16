-- Photos de souvenirs : le modèle reste embarqué dans progress.trips afin de
-- préserver la synchronisation offline existante. Seuls les fichiers binaires
-- vivent dans Storage. Les images sont converties en JPEG 2400 px côté app.
update storage.buckets
set public=false,
    file_size_limit=6291456,
    allowed_mime_types=array['image/jpeg']
where id='memory-photos';

-- Exports PDF privés, mis en cache par voyage + empreinte de la source.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('travel-journals','travel-journals',false,52428800,array['application/pdf'])
on conflict (id) do update
set public=false,file_size_limit=52428800,allowed_mime_types=array['application/pdf'];

create table if not exists public.trip_journal_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id text not null,
  source_hash text not null check (length(source_hash) between 32 and 128),
  storage_path text not null,
  page_count integer check (page_count is null or page_count > 0),
  file_size bigint check (file_size is null or file_size > 0),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,trip_id,source_hash),
  check (storage_path like user_id::text || '/trips/%')
);

alter table public.trip_journal_exports enable row level security;
grant select,insert,update,delete on public.trip_journal_exports to authenticated;

drop policy if exists "trip_journal_exports_select_own" on public.trip_journal_exports;
create policy "trip_journal_exports_select_own"
on public.trip_journal_exports for select to authenticated
using ((select auth.uid())=user_id);

drop policy if exists "trip_journal_exports_insert_own" on public.trip_journal_exports;
create policy "trip_journal_exports_insert_own"
on public.trip_journal_exports for insert to authenticated
with check ((select auth.uid())=user_id);

drop policy if exists "trip_journal_exports_update_own" on public.trip_journal_exports;
create policy "trip_journal_exports_update_own"
on public.trip_journal_exports for update to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);

drop policy if exists "trip_journal_exports_delete_own" on public.trip_journal_exports;
create policy "trip_journal_exports_delete_own"
on public.trip_journal_exports for delete to authenticated
using ((select auth.uid())=user_id);

drop policy if exists "travel_journals_select_own" on storage.objects;
create policy "travel_journals_select_own"
on storage.objects for select to authenticated
using (bucket_id='travel-journals' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "travel_journals_insert_own" on storage.objects;
create policy "travel_journals_insert_own"
on storage.objects for insert to authenticated
with check (bucket_id='travel-journals' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "travel_journals_delete_own" on storage.objects;
create policy "travel_journals_delete_own"
on storage.objects for delete to authenticated
using (bucket_id='travel-journals' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "travel_journals_update_own" on storage.objects;
create policy "travel_journals_update_own"
on storage.objects for update to authenticated
using (bucket_id='travel-journals' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='travel-journals' and (storage.foldername(name))[1]=(select auth.uid())::text);
