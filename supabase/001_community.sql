-- Campus Uniandes · alerts and events · run in Supabase SQL Editor as project owner.
-- No secret key is needed in the application. This migration is safe to run again.
begin;
create schema if not exists campus_private;
revoke all on schema campus_private from public;
create table if not exists public.campus_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.campus_admins enable row level security;
revoke all on public.campus_admins from anon, authenticated;
grant select on public.campus_admins to anon,authenticated;
drop policy if exists campus_admin_self on public.campus_admins;
create policy campus_admin_self on public.campus_admins for select to anon,authenticated using (user_id=(select auth.uid()));
create or replace function public.campus_is_admin() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.campus_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.campus_is_admin() from public;
grant execute on function public.campus_is_admin() to anon,authenticated;

create table if not exists public.campus_alerts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 confirmation_count integer not null default 0,
 kind text not null check (kind in ('elevator','stairs','path','other')),
 title text not null check (char_length(trim(title)) between 5 and 100),
 description text not null check (char_length(trim(description)) between 10 and 1500),
 building_code text not null check (char_length(building_code) between 1 and 12),
 location_detail text not null check (char_length(trim(location_detail)) between 3 and 180),
 latitude double precision not null check (latitude between 4.59 and 4.62),
 longitude double precision not null check (longitude between -74.08 and -74.05),
 photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
 status text not null default 'reported' check (status in ('reported','confirmed','resolved','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours')
);
create table if not exists public.campus_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 5 and 100),
 description text not null check (char_length(trim(description)) between 10 and 2000),
 organizer text not null check (char_length(trim(organizer)) between 2 and 120),
 category text not null check (category in ('academic','culture','sports','community')),
 building_code text not null check (char_length(building_code) between 1 and 12),
 location_detail text not null check (char_length(trim(location_detail)) between 3 and 180),
 latitude double precision not null check (latitude between 4.59 and 4.62),
 longitude double precision not null check (longitude between -74.08 and -74.05),
 starts_at timestamptz not null,
 ends_at timestamptz not null check (ends_at>starts_at and ends_at<=starts_at+interval '7 days'),
 registration_url text check (registration_url is null or (char_length(registration_url)<=1500 and registration_url ~ '^https://[^[:space:]]+$')),
 photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
 status text not null default 'published' check (status in ('published','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.campus_confirmations (
 alert_id uuid not null references public.campus_alerts(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(alert_id,user_id)
);
create index if not exists campus_alerts_active on public.campus_alerts(status,expires_at);
create index if not exists campus_events_active on public.campus_events(status,ends_at);
alter table public.campus_alerts enable row level security;
alter table public.campus_events enable row level security;
alter table public.campus_confirmations enable row level security;
revoke all on public.campus_alerts,public.campus_events,public.campus_confirmations from anon,authenticated;
grant select on public.campus_alerts,public.campus_events to anon,authenticated;
grant insert(kind,title,description,building_code,location_detail,latitude,longitude,photo_path) on public.campus_alerts to authenticated;
grant update(status) on public.campus_alerts to authenticated;
grant insert(title,description,organizer,category,building_code,location_detail,latitude,longitude,starts_at,ends_at,registration_url,photo_path) on public.campus_events to authenticated;
grant update(status) on public.campus_events to authenticated;
grant select on public.campus_confirmations to authenticated;
grant insert(alert_id) on public.campus_confirmations to authenticated;

drop policy if exists campus_alert_read on public.campus_alerts;
create policy campus_alert_read on public.campus_alerts for select to anon,authenticated using (
 (status in ('reported','confirmed') and expires_at>now()) or user_id=(select auth.uid()) or (select public.campus_is_admin())
);
drop policy if exists campus_alert_create on public.campus_alerts;
create policy campus_alert_create on public.campus_alerts for insert to authenticated with check (user_id=(select auth.uid()) and status='reported');
drop policy if exists campus_alert_moderate on public.campus_alerts;
create policy campus_alert_moderate on public.campus_alerts for update to authenticated using ((select public.campus_is_admin())) with check ((select public.campus_is_admin()));
drop policy if exists campus_event_read on public.campus_events;
create policy campus_event_read on public.campus_events for select to anon,authenticated using ((status='published' and ends_at>now()) or (select public.campus_is_admin()));
drop policy if exists campus_event_create on public.campus_events;
create policy campus_event_create on public.campus_events for insert to authenticated with check ((select public.campus_is_admin()) and user_id=(select auth.uid()));
drop policy if exists campus_event_moderate on public.campus_events;
create policy campus_event_moderate on public.campus_events for update to authenticated using ((select public.campus_is_admin())) with check ((select public.campus_is_admin()));
drop policy if exists campus_confirmation_self on public.campus_confirmations;
create policy campus_confirmation_self on public.campus_confirmations for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists campus_confirmation_create on public.campus_confirmations;
create policy campus_confirmation_create on public.campus_confirmations for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.campus_alerts a where a.id=alert_id and a.status in ('reported','confirmed') and a.expires_at>now() and a.user_id<>(select auth.uid()))
);
-- Return only aggregate confirmation counts, never other students' identities.
create or replace function public.campus_confirmation_counts() returns table(alert_id uuid,total bigint)
language sql stable security invoker set search_path='' as $$
 select id,confirmation_count::bigint from public.campus_alerts where status in ('reported','confirmed') and expires_at>now();
$$;
revoke all on function public.campus_confirmation_counts() from public;
grant execute on function public.campus_confirmation_counts() to anon,authenticated;
create or replace function campus_private.count_confirmation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Invalid confirmation identity'; end if;
 update public.campus_alerts set confirmation_count=confirmation_count+1 where id=new.alert_id;
 return new;
end;
$$;
revoke all on function campus_private.count_confirmation() from public;
drop trigger if exists campus_count_confirmation on public.campus_confirmations;
create trigger campus_count_confirmation after insert on public.campus_confirmations for each row execute function campus_private.count_confirmation();

create or replace function public.campus_stamp_update() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
drop trigger if exists campus_alert_stamp on public.campus_alerts;
create trigger campus_alert_stamp before update on public.campus_alerts for each row execute function public.campus_stamp_update();
drop trigger if exists campus_event_stamp on public.campus_events;
create trigger campus_event_stamp before update on public.campus_events for each row execute function public.campus_stamp_update();
-- Server-side limit; serializes simultaneous submissions from the same account.
create or replace function campus_private.campus_report_limit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>new.user_id then raise exception 'Invalid report identity'; end if;
 perform pg_advisory_xact_lock(hashtext(new.user_id::text));
 if (select count(*) from public.campus_alerts where user_id=new.user_id and created_at>now()-interval '24 hours')>=10 then
 raise exception 'Limite de 10 reportes por cuenta cada 24 horas'; end if;
 return new;
end;
$$;
drop trigger if exists campus_limit_reports on public.campus_alerts;
create trigger campus_limit_reports before insert on public.campus_alerts for each row execute function campus_private.campus_report_limit();
revoke all on function public.campus_stamp_update(),campus_private.campus_report_limit() from public;

-- Private images: published attachments get short-lived signed links via read policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('campus-community','campus-community',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists campus_photo_upload on storage.objects;
create policy campus_photo_upload on storage.objects for insert to authenticated with check (bucket_id='campus-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists campus_photo_read on storage.objects;
create policy campus_photo_read on storage.objects for select to anon,authenticated using (bucket_id='campus-community' and (
 (storage.foldername(name))[1]=(select auth.uid())::text or (select public.campus_is_admin()) or
 exists(select 1 from public.campus_alerts a where a.photo_path=name and a.status in ('reported','confirmed') and a.expires_at>now()) or
 exists(select 1 from public.campus_events e where e.photo_path=name and e.status='published' and e.ends_at>now())
));
drop policy if exists campus_photo_cleanup on storage.objects;
create policy campus_photo_cleanup on storage.objects for delete to authenticated using(bucket_id='campus-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
create index if not exists campus_alerts_user on public.campus_alerts(user_id,created_at);
create index if not exists campus_events_user on public.campus_events(user_id);
create index if not exists campus_confirmations_user on public.campus_confirmations(user_id);
commit;
