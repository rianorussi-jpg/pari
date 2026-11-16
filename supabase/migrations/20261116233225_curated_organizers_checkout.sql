-- Curated organizer access and a checkout that stores attendee details.
begin;
alter table public.pari_ticket_orders add column if not exists attendee_name text;
alter table public.pari_ticket_orders add column if not exists attendee_email text;
alter table public.pari_ticket_orders add column if not exists attendee_phone text;

create or replace function pari_private.can_organize() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.pari_profiles where id=auth.uid() and role in ('business','admin'));
$$;
revoke all on function pari_private.can_organize() from public,anon;
grant execute on function pari_private.can_organize() to authenticated;
-- Removing organizer permission also removes access to event orders and check-in.
create or replace function pari_private.manages_event(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (pari_private.is_admin() or (pari_private.can_organize() and exists(select 1 from public.pari_events e where e.id=p_id and (e.organizer_id=auth.uid() or exists(select 1 from public.pari_venue_members m where m.venue_id=e.venue_id and m.user_id=auth.uid())))));
$$;
drop policy if exists pari_event_create on public.pari_events;
create policy pari_event_create on public.pari_events for insert to authenticated with check(organizer_id=(select auth.uid()) and venue_id is null and (select pari_private.can_organize()));
drop policy if exists pari_event_media_insert on storage.objects;
create policy pari_event_media_insert on storage.objects for insert to authenticated with check(bucket_id='pari-media' and (storage.foldername(name))[1]='events' and (storage.foldername(name))[2]=(select auth.uid())::text and (select pari_private.can_organize()));

create or replace function pari_private.set_organizer(p_user_id uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not pari_private.is_admin() then raise exception 'Solo administradores pueden autorizar organizadores.';end if;
 if p_enabled is null then raise exception 'Indica el permiso de organizador.';end if;
 if exists(select 1 from public.pari_profiles where id=p_user_id and role='admin') then raise exception 'Los permisos de administrador no se cambian desde este panel.';end if;
 update public.pari_profiles set role=case when p_enabled then 'business' else 'client' end where id=p_user_id;
 if not found then raise exception 'No existe el perfil.';end if;
end;$$;
create or replace function public.pari_set_organizer(p_user_id uuid,p_enabled boolean) returns void language sql security invoker set search_path='' as $$select pari_private.set_organizer(p_user_id,p_enabled);$$;
revoke all on function pari_private.set_organizer(uuid,boolean),public.pari_set_organizer(uuid,boolean) from public,anon;
grant execute on function pari_private.set_organizer(uuid,boolean),public.pari_set_organizer(uuid,boolean) to authenticated;

create or replace function pari_private.checkout_demo(p_event_id uuid,p_quantity integer,p_card text,p_request_id uuid,p_attendee_name text,p_attendee_email text,p_attendee_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; o public.pari_ticket_orders; v_attendee_name text:=trim(p_attendee_name);v_attendee_email text:=lower(trim(p_attendee_email));v_attendee_phone text:=nullif(trim(p_attendee_phone),'');
begin
 if auth.uid() is null then raise exception 'Inicia sesión para completar tu compra.';end if;
 if v_attendee_name is null or length(v_attendee_name)<2 or length(v_attendee_name)>150 then raise exception 'Escribe el nombre completo del asistente.';end if;
 if v_attendee_email is null or length(v_attendee_email)>254 or v_attendee_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Escribe un correo válido para el asistente.';end if;
 if v_attendee_phone is not null and (length(v_attendee_phone)>30 or v_attendee_phone !~ '^[+0-9() .-]{7,30}$') then raise exception 'Escribe un celular válido o deja el campo vacío.';end if;
 -- Existing locked checkout function validates stock, card, quantity, event and retry ID.
 result:=pari_private.buy_demo(p_event_id,p_quantity,p_card,p_request_id);
 select * into o from public.pari_ticket_orders where id=(result->>'id')::uuid and user_id=auth.uid() for update;
 if not found then raise exception 'No se pudo confirmar la orden.';end if;
 if o.attendee_name is not null then
  if o.attendee_name is distinct from v_attendee_name or o.attendee_email is distinct from v_attendee_email or o.attendee_phone is distinct from v_attendee_phone then raise exception 'Esta compra ya fue confirmada con otros datos. Revisa Mis boletos antes de intentar otra compra.';end if;
  return to_jsonb(o);
 end if;
 update public.pari_ticket_orders set attendee_name=v_attendee_name,attendee_email=v_attendee_email,attendee_phone=v_attendee_phone where id=o.id returning * into o;
 return to_jsonb(o);
end;$$;
create or replace function public.pari_checkout_demo(p_event_id uuid,p_quantity integer,p_card text,p_request_id uuid,p_attendee_name text,p_attendee_email text,p_attendee_phone text) returns jsonb language sql security invoker set search_path='' as $$select pari_private.checkout_demo(p_event_id,p_quantity,p_card,p_request_id,p_attendee_name,p_attendee_email,p_attendee_phone);$$;
revoke all on function pari_private.checkout_demo(uuid,integer,text,uuid,text,text,text),public.pari_checkout_demo(uuid,integer,text,uuid,text,text,text) from public,anon;
grant execute on function pari_private.checkout_demo(uuid,integer,text,uuid,text,text,text),public.pari_checkout_demo(uuid,integer,text,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
