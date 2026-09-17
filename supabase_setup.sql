-- East-Washington Times / BEWNHS
-- Ready-to-run Supabase setup for a public school journalism site with staff-only publishing.
-- Run in Supabase Dashboard -> SQL Editor.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------- Helpers ----------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Profiles / roles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  role text not null default 'writer' check (role in ('writer','editor','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Backfill profiles if Auth users already existed before this script was run.
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'display_name', split_part(email,'@',1))
from auth.users
on conflict (id) do nothing;

create or replace function private.is_editor()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('editor','admin')
    );
$$;

revoke all on function private.is_editor() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_editor() to authenticated;

-- ---------- Articles ----------
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) <= 180),
  dek text,
  body text not null default '',
  category text not null check (category in ('News','Features','Editorial','Opinion','Sports','Science & Technology','Campus Life','Photojournalism')),
  author_name text not null,
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  is_featured boolean not null default false,
  is_breaking boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists articles_status_published_idx on public.articles(status,published_at desc);
create index if not exists articles_category_published_idx on public.articles(category,published_at desc);
create index if not exists articles_featured_idx on public.articles(is_featured) where is_featured = true;
create index if not exists articles_breaking_idx on public.articles(is_breaking) where is_breaking = true;

-- ---------- Staff / Editorial Board ----------
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  position text not null,
  group_type text not null default 'staff' check (group_type in ('editorial_board','staff','adviser')),
  bio text,
  photo_path text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_group_sort_idx on public.staff_members(group_type,sort_order);

-- ---------- Achievements ----------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  competition_name text,
  award text,
  level text,
  achievement_date date,
  description text,
  image_path text,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists achievements_date_idx on public.achievements(achievement_date desc);

-- ---------- Photojournalism ----------
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text,
  photographer text,
  event_name text,
  image_path text not null,
  taken_at timestamptz,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gallery_taken_idx on public.gallery_images(taken_at desc);

-- ---------- Optional site settings ----------
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  publication_name text not null default 'East-Washington Times',
  school_name text not null default 'Bagumbayan-East Washington National High School',
  school_abbreviation text not null default 'BEWNHS',
  mission text,
  vision text,
  publication_history text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1) on conflict (id) do nothing;

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','articles','staff_members','achievements','gallery_images','site_settings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.staff_members enable row level security;
alter table public.achievements enable row level security;
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: users can read their own profile; editors can read all staff profiles.
drop policy if exists "profiles_select_own_or_editor" on public.profiles;
create policy "profiles_select_own_or_editor" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or private.is_editor());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Public readers can only see published articles; editors can see drafts too.
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles
for select to anon, authenticated
using (status = 'published');

drop policy if exists "articles_editor_read_all" on public.articles;
create policy "articles_editor_read_all" on public.articles
for select to authenticated
using (private.is_editor());

drop policy if exists "articles_editor_insert" on public.articles;
create policy "articles_editor_insert" on public.articles
for insert to authenticated
with check (private.is_editor());

drop policy if exists "articles_editor_update" on public.articles;
create policy "articles_editor_update" on public.articles
for update to authenticated
using (private.is_editor())
with check (private.is_editor());

drop policy if exists "articles_editor_delete" on public.articles;
create policy "articles_editor_delete" on public.articles
for delete to authenticated
using (private.is_editor());

-- Staff board is public; only editors can modify it.
drop policy if exists "staff_public_read" on public.staff_members;
create policy "staff_public_read" on public.staff_members
for select to anon, authenticated using (is_active = true);

drop policy if exists "staff_editor_read_all" on public.staff_members;
create policy "staff_editor_read_all" on public.staff_members
for select to authenticated using (private.is_editor());

drop policy if exists "staff_editor_insert" on public.staff_members;
create policy "staff_editor_insert" on public.staff_members for insert to authenticated with check (private.is_editor());
drop policy if exists "staff_editor_update" on public.staff_members;
create policy "staff_editor_update" on public.staff_members for update to authenticated using (private.is_editor()) with check (private.is_editor());
drop policy if exists "staff_editor_delete" on public.staff_members;
create policy "staff_editor_delete" on public.staff_members for delete to authenticated using (private.is_editor());

-- Achievements are public when published.
drop policy if exists "achievements_public_read" on public.achievements;
create policy "achievements_public_read" on public.achievements
for select to anon, authenticated using (is_published = true);

drop policy if exists "achievements_editor_read_all" on public.achievements;
create policy "achievements_editor_read_all" on public.achievements
for select to authenticated using (private.is_editor());
drop policy if exists "achievements_editor_all_insert" on public.achievements;
create policy "achievements_editor_all_insert" on public.achievements for insert to authenticated with check (private.is_editor());
drop policy if exists "achievements_editor_all_update" on public.achievements;
create policy "achievements_editor_all_update" on public.achievements for update to authenticated using (private.is_editor()) with check (private.is_editor());
drop policy if exists "achievements_editor_all_delete" on public.achievements;
create policy "achievements_editor_all_delete" on public.achievements for delete to authenticated using (private.is_editor());

-- Photojournalism is public when published.
drop policy if exists "gallery_public_read" on public.gallery_images;
create policy "gallery_public_read" on public.gallery_images
for select to anon, authenticated using (is_published = true);

drop policy if exists "gallery_editor_read_all" on public.gallery_images;
create policy "gallery_editor_read_all" on public.gallery_images
for select to authenticated using (private.is_editor());
drop policy if exists "gallery_editor_insert" on public.gallery_images;
create policy "gallery_editor_insert" on public.gallery_images for insert to authenticated with check (private.is_editor());
drop policy if exists "gallery_editor_update" on public.gallery_images;
create policy "gallery_editor_update" on public.gallery_images for update to authenticated using (private.is_editor()) with check (private.is_editor());
drop policy if exists "gallery_editor_delete" on public.gallery_images;
create policy "gallery_editor_delete" on public.gallery_images for delete to authenticated using (private.is_editor());

-- Settings are public to read, editors can change them.
drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "settings_editor_update" on public.site_settings;
create policy "settings_editor_update" on public.site_settings for update to authenticated using (private.is_editor()) with check (private.is_editor());

-- ---------- Data API grants ----------
revoke all on public.profiles, public.articles, public.staff_members, public.achievements, public.gallery_images, public.site_settings from anon, authenticated;
grant select on public.articles, public.staff_members, public.achievements, public.gallery_images, public.site_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_path) on public.profiles to authenticated;
grant insert, update, delete on public.articles, public.staff_members, public.achievements, public.gallery_images to authenticated;
grant update on public.site_settings to authenticated;

-- ---------- Public media bucket ----------
-- Article images are meant to be publicly visible on the journalism website.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('journalism-media','journalism-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket handles public downloads. These policies govern staff file management.
drop policy if exists "journalism_media_editor_select" on storage.objects;
create policy "journalism_media_editor_select" on storage.objects
for select to authenticated
using (bucket_id = 'journalism-media' and private.is_editor());

drop policy if exists "journalism_media_editor_insert" on storage.objects;
create policy "journalism_media_editor_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'journalism-media'
  and private.is_editor()
  and (storage.foldername(name))[1] in ('articles','staff','galleries','achievements')
);

drop policy if exists "journalism_media_editor_update" on storage.objects;
create policy "journalism_media_editor_update" on storage.objects
for update to authenticated
using (bucket_id = 'journalism-media' and private.is_editor())
with check (bucket_id = 'journalism-media' and private.is_editor());

drop policy if exists "journalism_media_editor_delete" on storage.objects;
create policy "journalism_media_editor_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'journalism-media' and private.is_editor());

commit;

-- IMPORTANT: after creating your first Auth user, promote ONLY trusted publishing staff.
-- Replace the UUID below with the user's auth.users ID from Authentication -> Users:
-- update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000000';
-- Other trusted writers can be promoted to 'editor'. Keep normal accounts as 'writer'.
