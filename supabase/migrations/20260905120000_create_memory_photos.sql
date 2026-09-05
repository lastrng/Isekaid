-- Souvenirs personnels : bucket privé, chaque compte ne voit que son dossier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memory-photos', 'memory-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=2097152, allowed_mime_types=array['image/jpeg'];

create policy "memory_photos_select_own" on storage.objects for select to authenticated
using (bucket_id='memory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "memory_photos_insert_own" on storage.objects for insert to authenticated
with check (bucket_id='memory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "memory_photos_delete_own" on storage.objects for delete to authenticated
using (bucket_id='memory-photos' and (storage.foldername(name))[1]=auth.uid()::text);
