-- SF Pickle Courts: Supabase setup
-- Run this entire script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default 'San Francisco, Agusan del Sur',
  description text not null default '',
  website_url text not null unique,
  facebook_url text,
  location_url text,
  logo_url text,
  tag text not null default 'Visit website',
  initials text,
  accent text not null default 'lime' check (accent in ('lime','orange','cream')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_court_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_court_admin() from public;
grant execute on function public.is_court_admin() to authenticated;

alter table public.admin_users enable row level security;
alter table public.courts enable row level security;

drop policy if exists "Public can read active courts" on public.courts;
create policy "Public can read active courts"
on public.courts for select
to anon, authenticated
using (is_active = true or public.is_court_admin());

drop policy if exists "Admins can insert courts" on public.courts;
create policy "Admins can insert courts"
on public.courts for insert to authenticated
with check (public.is_court_admin());

drop policy if exists "Admins can update courts" on public.courts;
create policy "Admins can update courts"
on public.courts for update to authenticated
using (public.is_court_admin())
with check (public.is_court_admin());

drop policy if exists "Admins can delete courts" on public.courts;
create policy "Admins can delete courts"
on public.courts for delete to authenticated
using (public.is_court_admin());

-- Storage bucket for venue logos. Public read is intentional; only admins can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('court-logos', 'court-logos', true, 5242880, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists "Public can view court logos" on storage.objects;
create policy "Public can view court logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'court-logos');

drop policy if exists "Admins can upload court logos" on storage.objects;
create policy "Admins can upload court logos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'court-logos' and public.is_court_admin());

drop policy if exists "Admins can update court logos" on storage.objects;
create policy "Admins can update court logos"
on storage.objects for update
to authenticated
using (bucket_id = 'court-logos' and public.is_court_admin())
with check (bucket_id = 'court-logos' and public.is_court_admin());

drop policy if exists "Admins can delete court logos" on storage.objects;
create policy "Admins can delete court logos"
on storage.objects for delete
to authenticated
using (bucket_id = 'court-logos' and public.is_court_admin());

-- Seed current directory entries. Logo URLs are initially null; upload/replace
-- logos in /admin. Local bundled logos remain as fallback for these three venues.
insert into public.courts
(name, location, description, website_url, location_url, tag, initials, accent, sort_order)
values
('Eastside Pickle','San Francisco area','Visit Eastside Pickle''s website for venue information and booking details.','https://eastsidepickle.com/','https://www.google.com/maps/search/?api=1&query=Eastside+Pickle+San+Francisco+Agusan+del+Sur','Official website','EP','lime',1),
('Highway Drive Pickleball','San Francisco area','Explore the courts and make your reservation through Highway Drive''s booking page.','https://hwaydrive-pickleball.courtbooking.workers.dev/','https://www.google.com/maps/search/?api=1&query=Highway+Drive+Pickleball+San+Francisco+Agusan+del+Sur','Online booking','HD','orange',2),
('Lakbai Pickleball','San Francisco area','Head to Lakbai Pickleball''s booking website to get your game arranged.','https://lakbaipickleballbooking.netlify.app/','https://www.google.com/maps/search/?api=1&query=Lakbai+Pickleball+San+Francisco+Agusan+del+Sur','Online booking','LP','cream',3)
on conflict (website_url) do nothing;

-- After creating your admin user in Supabase Authentication, replace the UUID below
-- with that user's ID and run this insert:
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID');
