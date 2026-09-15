-- Item photos and logos: public bucket `item-photos`, one folder per restaurant (<restaurant_id>/…).
-- Anyone can view (public URLs); only the restaurant's owner can add, replace or remove files in its folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- True when the object's first folder is a restaurant the current user owns.
create function private.owns_photo_folder(object_name text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r
    where r.id::text = (storage.foldername(object_name))[1]
      and r.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_photo_folder(text) from public;
grant execute on function private.owns_photo_folder(text) to authenticated;

create policy "Owners list their photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and private.owns_photo_folder(name));

create policy "Owners upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and private.owns_photo_folder(name));

create policy "Owners replace their photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'item-photos' and private.owns_photo_folder(name))
  with check (bucket_id = 'item-photos' and private.owns_photo_folder(name));

create policy "Owners delete their photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and private.owns_photo_folder(name));
