-- Phase 10: memories — photos + a short note + rating (dates.rating) per date.
-- Photos live in the private "date-photos" bucket at
--   {couple_id}/{date_id}/{photo_id}.jpg   (+ {photo_id}_t.jpg thumbnail)
-- and are shown through short-lived signed URLs.

alter table public.dates add column memory text check (char_length(memory) <= 2000);
grant insert (memory), update (memory) on public.dates to authenticated;

create table public.date_photos (
  id           uuid primary key default gen_random_uuid(),
  date_id      uuid not null references public.dates (id) on delete cascade,
  couple_id    uuid not null default public.my_couple_id()
               references public.couples (id) on delete cascade,
  storage_path text not null unique,
  thumb_path   text,
  caption      text check (char_length(caption) <= 300),
  uploaded_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index date_photos_date_idx on public.date_photos (date_id);

alter table public.date_photos enable row level security;

create policy "date_photos: couple only" on public.date_photos
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (
    couple_id = (select public.my_couple_id())
    and exists (select 1 from public.dates d where d.id = date_id and d.couple_id = date_photos.couple_id)
    -- files must sit in this couple's folder
    and storage_path like (couple_id::text || '/' || date_id::text || '/%')
    and (thumb_path is null or thumb_path like (couple_id::text || '/' || date_id::text || '/%'))
  );

revoke all on public.date_photos from anon, authenticated;
grant select, delete on public.date_photos to authenticated;
grant insert (id, date_id, storage_path, thumb_path, caption), update (caption)
  on public.date_photos to authenticated;

alter publication supabase_realtime add table public.date_photos;

-- ───────────── Storage ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('date-photos', 'date-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

-- First folder of the object path must be the caller's couple id.
create policy "date-photos: couple read" on storage.objects
  for select to authenticated
  using (bucket_id = 'date-photos'
         and (storage.foldername(name))[1] = (select public.my_couple_id())::text);

create policy "date-photos: couple upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'date-photos'
              and (storage.foldername(name))[1] = (select public.my_couple_id())::text);

create policy "date-photos: couple delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'date-photos'
         and (storage.foldername(name))[1] = (select public.my_couple_id())::text);
