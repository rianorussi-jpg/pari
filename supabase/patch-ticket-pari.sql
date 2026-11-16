-- Ticket Pari: additive upgrade of existing pari_ tables. Keeps legacy venue data.
begin;
create schema if not exists pari_private;
revoke all on schema pari_private from public, anon;
grant usage on schema pari_private to authenticated;
alter table public.pari_profiles add column if not exists is_verified boolean not null default false;
alter table public.pari_profiles add column if not exists verification_requested boolean not null default false;
alter table public.pari_events add column if not exists organizer_id uuid references auth.users(id);
alter table public.pari_events add column if not exists organizer_name text;
alter table public.pari_events add column if not exists organizer_verified boolean not null default false;
alter table public.pari_events add column if not exists time_zone text not null default 'America/Mexico_City';
alter table public.pari_events add column if not exists category text not null default 'Otros';
alter table public.pari_ticket_orders add column if not exists is_demo boolean not null default false;
alter table public.pari_ticket_orders add column if not exists request_id uuid;
alter table public.pari_ticket_orders add column if not exists checked_in_at timestamptz;
alter table public.pari_ticket_orders add column if not exists checked_in_by uuid references auth.users(id);
create unique index if not exists pari_order_request_unique on public.pari_ticket_orders(user_id,request_id) where request_id is not null;
create index if not exists pari_events_organizer_idx on public.pari_events(organizer_id);
create index if not exists pari_events_catalog_idx on public.pari_events(status,city,starts_at);
create index if not exists pari_orders_event_idx on public.pari_ticket_orders(event_id);

create or replace function pari_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pari_profiles where id=auth.uid() and role='admin');
$$;
create or replace function pari_private.manages_event(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (pari_private.is_admin() or exists(select 1 from public.pari_events e where e.id=p_id and (e.organizer_id=auth.uid() or exists(select 1 from public.pari_venue_members m where m.venue_id=e.venue_id and m.user_id=auth.uid()))));
$$;
-- Prevent profile owners from promoting themselves or issuing their own checkmark.
create or replace function pari_private.guard_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not pari_private.is_admin() then
  if new.role is distinct from old.role or new.is_verified is distinct from old.is_verified then raise exception 'Solo el administrador puede cambiar roles o verificaciones.'; end if;
 end if;
 return new;
end; $$;
drop trigger if exists pari_guard_profile on public.pari_profiles;
create trigger pari_guard_profile before update on public.pari_profiles for each row execute function pari_private.guard_profile();
-- Copy only public organizer data onto event rows; never expose email/phone.
create or replace function pari_private.event_details() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.organizer_id is not null then
  select coalesce(nullif(full_name,''),'Organizador'),is_verified into new.organizer_name,new.organizer_verified from public.pari_profiles where id=new.organizer_id;
  new.organizer_name:=coalesce(new.organizer_name,'Organizador');new.organizer_verified:=coalesce(new.organizer_verified,false);
 elsif new.venue_id is not null then
  select name,is_verified into new.organizer_name,new.organizer_verified from public.pari_venues where id=new.venue_id;
 end if;
 if new.ticket_price < 0 or new.ticket_inventory < 0 then raise exception 'Precio y disponibilidad no pueden ser negativos.';end if;
 if new.ends_at is not null and new.ends_at<=new.starts_at then raise exception 'El fin debe ser posterior al inicio.';end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.time_zone) then raise exception 'Zona horaria no válida.';end if;
 if length(trim(new.title))=0 or length(trim(new.city))=0 then raise exception 'Completa el título y la ciudad.';end if;
 return new;
end; $$;
drop trigger if exists pari_ticket_event_details on public.pari_events;
create trigger pari_ticket_event_details before insert or update on public.pari_events for each row execute function pari_private.event_details();
create or replace function pari_private.sync_organizer() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.full_name is distinct from old.full_name or new.is_verified is distinct from old.is_verified then
  update public.pari_events set organizer_name=coalesce(nullif(new.full_name,''),'Organizador'),organizer_verified=new.is_verified where organizer_id=new.id;
 end if;return new;
end; $$;
drop trigger if exists pari_sync_organizer on public.pari_profiles;
create trigger pari_sync_organizer after update on public.pari_profiles for each row execute function pari_private.sync_organizer();
-- Replace only event policies; retain all legacy reservations and venue policies.
do $$ declare p record;begin for p in select policyname from pg_policies where schemaname='public' and tablename='pari_events' loop execute format('drop policy %I on public.pari_events',p.policyname);end loop;end $$;
alter table public.pari_events enable row level security;
create policy pari_event_read on public.pari_events for select to anon,authenticated using(status='published' or pari_private.manages_event(id));
create policy pari_event_create on public.pari_events for insert to authenticated with check(organizer_id=auth.uid() and venue_id is null);
create policy pari_event_edit on public.pari_events for update to authenticated using(pari_private.manages_event(id)) with check(pari_private.manages_event(id));
-- Ownership and venue association cannot be reassigned through an update.
create or replace function pari_private.guard_event_owner() returns trigger language plpgsql set search_path='' as $$
begin if auth.uid() is not null and (new.organizer_id is distinct from old.organizer_id or new.venue_id is distinct from old.venue_id) then raise exception 'No se puede cambiar el propietario del evento.';end if;return new;end;$$;
drop trigger if exists pari_guard_event_owner on public.pari_events;
create trigger pari_guard_event_owner before update on public.pari_events for each row execute function pari_private.guard_event_owner();
grant select on public.pari_events to anon,authenticated;
grant insert,update on public.pari_events to authenticated;
revoke delete on public.pari_events from authenticated;
-- Orders are immutable from the REST table endpoint. All writes use validated functions.
revoke insert,update,delete on public.pari_ticket_orders from anon,authenticated;
grant select on public.pari_ticket_orders to authenticated;
drop policy if exists pari_organizer_orders_read on public.pari_ticket_orders;
create policy pari_organizer_orders_read on public.pari_ticket_orders for select to authenticated using(pari_private.manages_event(event_id));

create or replace function pari_private.buy_demo(p_event_id uuid,p_quantity integer,p_card text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.pari_events; o public.pari_ticket_orders;
begin
 if auth.uid() is null then raise exception 'Inicia sesión para comprar.';end if;
 if p_card is distinct from '1234123412341234' then raise exception 'Usa la tarjeta de prueba 1234 1234 1234 1234. No se aceptan tarjetas reales.';end if;
 if p_quantity is null or p_quantity<1 or p_quantity>10 or p_request_id is null then raise exception 'Selecciona de 1 a 10 boletos.';end if;
 -- Lock event first: serializes stock and duplicate requests, preventing overselling.
 select * into e from public.pari_events where id=p_event_id for update;
 if not found then raise exception 'El evento no existe.';end if;
 select * into o from public.pari_ticket_orders where user_id=auth.uid() and request_id=p_request_id;
 if found then
  if o.event_id<>p_event_id or o.quantity<>p_quantity then raise exception 'La solicitud ya fue utilizada.';end if;
  return to_jsonb(o);
 end if;
 if e.status<>'published' or e.starts_at<=now() then raise exception 'Este evento ya no está disponible para compra.';end if;
 if e.ticket_price is null or e.ticket_price<0 then raise exception 'El evento no tiene precio válido.';end if;
 if e.ticket_inventory is not null and e.ticket_inventory<p_quantity then raise exception 'No hay suficientes boletos disponibles.';end if;
 insert into public.pari_ticket_orders(user_id,event_id,quantity,unit_price,total,status,is_demo,request_id)
 values(auth.uid(),e.id,p_quantity,e.ticket_price,e.ticket_price*p_quantity,'paid',true,p_request_id) returning * into o;
 if e.ticket_inventory is not null then update public.pari_events set ticket_inventory=ticket_inventory-p_quantity where id=e.id;end if;
 return to_jsonb(o);
end;$$;
create or replace function public.pari_buy_demo_tickets(p_event_id uuid,p_quantity integer,p_card text,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select pari_private.buy_demo(p_event_id,p_quantity,p_card,p_request_id);$$;
create or replace function pari_private.check_in(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.pari_ticket_orders;e public.pari_events;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 select * into o from public.pari_ticket_orders where qr_token::text=p_token for update;
 if not found or not pari_private.manages_event(o.event_id) then raise exception 'Código no válido para tus eventos.';end if;
 if o.status<>'paid' then raise exception 'La orden no está confirmada.';end if;
 select * into e from public.pari_events where id=o.event_id;
 if e.status='cancelled' then raise exception 'El evento está cancelado.';end if;
 if o.checked_in_at is not null then raise exception 'Este boleto ya registró su ingreso.';end if;
 update public.pari_ticket_orders set checked_in_at=now(),checked_in_by=auth.uid() where id=o.id returning * into o;
 return jsonb_build_object('id',o.id,'quantity',o.quantity);
end;$$;
create or replace function public.pari_check_in(p_token text) returns jsonb language sql security invoker set search_path='' as $$select pari_private.check_in(p_token);$$;
create or replace function pari_private.set_verified(p_user_id uuid,p_verified boolean) returns void language plpgsql security definer set search_path='' as $$
begin if not pari_private.is_admin() then raise exception 'Solo administradores pueden verificar organizadores.';end if;
 update public.pari_profiles set is_verified=p_verified,verification_requested=false where id=p_user_id;
 if not found then raise exception 'No existe el perfil.';end if;
end;$$;
create or replace function public.pari_set_verified(p_user_id uuid,p_verified boolean) returns void language sql security invoker set search_path='' as $$select pari_private.set_verified(p_user_id,p_verified);$$;
-- No privileged function is anonymously callable; private schema is not exposed by PostgREST.
revoke all on all functions in schema pari_private from public,anon,authenticated;
grant execute on function pari_private.is_admin(),pari_private.manages_event(uuid),pari_private.buy_demo(uuid,integer,text,uuid),pari_private.check_in(text),pari_private.set_verified(uuid,boolean) to authenticated;
-- Public event policy must work for anonymous catalog visitors too.
grant usage on schema pari_private to anon;
grant execute on function pari_private.manages_event(uuid),pari_private.is_admin() to anon;
revoke all on function public.pari_buy_demo_tickets(uuid,integer,text,uuid),public.pari_check_in(text),public.pari_set_verified(uuid,boolean) from public,anon;
grant execute on function public.pari_buy_demo_tickets(uuid,integer,text,uuid),public.pari_check_in(text),public.pari_set_verified(uuid,boolean) to authenticated;
-- Upload paths scoped to the signed-in organizer. Existing avatar policies stay intact.
drop policy if exists pari_event_media_insert on storage.objects;
create policy pari_event_media_insert on storage.objects for insert to authenticated with check(bucket_id='pari-media' and (storage.foldername(name))[1]='events' and (storage.foldername(name))[2]=auth.uid()::text);
-- Populate public labels on legacy events without changing their owners or visibility.
update public.pari_events e set organizer_name=v.name,organizer_verified=v.is_verified from public.pari_venues v where v.id=e.venue_id and e.organizer_id is null;
notify pgrst,'reload schema';
commit;
