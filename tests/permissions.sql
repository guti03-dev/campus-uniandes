-- Integration test: fixtures and changes are always rolled back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
insert into public.campus_admins(user_id) values('00000000-0000-4000-8000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.campus_alerts(kind,title,description,building_code,location_detail,latitude,longitude) values('stairs','Prueba transaccional','Reporte temporal de prueba','ML','Entrada principal',4.601,-74.065);
do $$ begin
 if public.campus_is_admin() then raise exception 'Student became admin'; end if;
 begin
 insert into public.campus_admins(user_id) values(auth.uid());
 raise exception 'Privilege escalation allowed';
 exception when insufficient_privilege then null; end;
 begin
 insert into public.campus_alerts(user_id,kind,title,description,building_code,location_detail,latitude,longitude) values('00000000-0000-4000-8000-000000000002','stairs','Prueba falsa','Reporte temporal de prueba','ML','Entrada principal',4.601,-74.065);
 raise exception 'Identity spoof allowed';
 exception when insufficient_privilege then null; end;
 update public.campus_alerts set status='confirmed' where title='Prueba transaccional';
 if found then raise exception 'Student moderation allowed'; end if;
 begin
 insert into public.campus_events(title,description,organizer,category,building_code,location_detail,latitude,longitude,starts_at,ends_at) values('Evento falso','Descripcion de prueba','Prueba','academic','ML','Auditorio',4.601,-74.065,now(),now()+interval '1 hour');
 raise exception 'Student event allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
insert into public.campus_confirmations(alert_id) select id from public.campus_alerts where title='Prueba transaccional';
do $$ begin
 if (select total from public.campus_confirmation_counts() c join public.campus_alerts a on c.alert_id=a.id where a.title='Prueba transaccional')<>1 then raise exception 'Count failed'; end if;
 begin
 insert into public.campus_confirmations(alert_id) select id from public.campus_alerts where title='Prueba transaccional';
 raise exception 'Duplicate confirmation allowed';
 exception when unique_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',true);
do $$ begin
 if not public.campus_is_admin() then raise exception 'Admin lookup failed'; end if;
 update public.campus_alerts set status='resolved' where title='Prueba transaccional';
 if not found then raise exception 'Admin moderation failed'; end if;
end $$;
insert into public.campus_events(title,description,organizer,category,building_code,location_detail,latitude,longitude,starts_at,ends_at) values('Evento de prueba','Descripcion de prueba','Prueba','academic','ML','Auditorio',4.601,-74.065,now(),now()+interval '1 hour');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if exists(select 1 from public.campus_alerts where title='Prueba transaccional') then raise exception 'Resolved alert publicly visible'; end if;
 if not exists(select 1 from public.campus_events where title='Evento de prueba') then raise exception 'Event not visible'; end if;
 if public.campus_is_admin() then raise exception 'Anon admin'; end if;
end $$;
rollback;
select 'All permission checks passed; fixtures rolled back' as result;
