begin;

alter table public.pari_events
  add column commission_per_ticket numeric(10,2) not null default 0 check (commission_per_ticket >= 0),
  add column transfer_clabe text not null default '000000000000000000' check (transfer_clabe ~ '^[0-9]{18}$'),
  add column transfer_holder text not null default '0' check (length(transfer_holder) between 1 and 150),
  add column transfer_concept text not null default '0' check (length(transfer_concept) between 1 and 100);
alter table public.pari_ticket_orders
  alter column qr_token drop not null,
  add column payment_method text not null default 'card' check (payment_method in ('card','transfer')),
  add column commission_total numeric(12,2) not null default 0,
  add column transfer_details jsonb,
  add column receipt_path text,
  add column reserved_until timestamptz,
  add column receipt_submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null;

create table public.pari_event_assignments (
  event_id uuid references public.pari_events(id) on delete cascade,
  user_id uuid references public.pari_profiles(id) on delete cascade,
  primary key(event_id,user_id)
);
create index pari_assigned_user_idx on public.pari_event_assignments(user_id);
create index pari_pending_reservations_idx on public.pari_ticket_orders(reserved_until)
  where payment_method='transfer' and status='pending' and receipt_path is null;
alter table public.pari_event_assignments enable row level security;
grant select,insert,delete on public.pari_event_assignments to authenticated;
create policy pari_assignment_read on public.pari_event_assignments for select to authenticated
  using (user_id=(select auth.uid()) or (select pari_private.is_admin()));
create policy pari_assignment_admin_add on public.pari_event_assignments for insert to authenticated
  with check ((select pari_private.is_admin()));
create policy pari_assignment_admin_remove on public.pari_event_assignments for delete to authenticated
  using ((select pari_private.is_admin()));

create or replace function pari_private.manages_event(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
   pari_private.is_admin() or exists (
     select 1 from public.pari_event_assignments a where a.event_id=p_id and a.user_id=auth.uid()
   ) or (pari_private.can_organize() and exists (
     select 1 from public.pari_events e where e.id=p_id and (e.organizer_id=auth.uid() or exists (
       select 1 from public.pari_venue_members m where m.venue_id=e.venue_id and m.user_id=auth.uid()
     ))
   ))
 );
$$;

create function pari_private.guard_event_finance() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and not pari_private.is_admin() then
   if tg_op='INSERT' then raise exception 'Solo administración puede crear eventos.'; end if;
   if new.commission_per_ticket is distinct from old.commission_per_ticket
      or new.organizer_id is distinct from old.organizer_id
      or new.venue_id is distinct from old.venue_id then
     raise exception 'Solo administración puede editar la comisión o la asignación.';
   end if;
 end if;
 if new.commission_per_ticket > coalesce(new.ticket_price,0) then
   raise exception 'La comisión por boleto no puede superar el precio.';
 end if;
 return new;
end;
$$;
create trigger pari_guard_event_finance before insert or update on public.pari_events
  for each row execute function pari_private.guard_event_finance();

drop policy pari_event_create on public.pari_events;
create policy pari_event_create on public.pari_events for insert to authenticated
  with check ((select pari_private.is_admin()) and organizer_id=(select auth.uid()) and venue_id is null);
drop policy pari_event_media_insert on storage.objects;
create policy pari_event_media_insert on storage.objects for insert to authenticated
  with check (bucket_id='pari-media' and (storage.foldername(name))[1]='events'
    and (storage.foldername(name))[2]=(select auth.uid())::text and (
      (select pari_private.can_organize()) or exists (
        select 1 from public.pari_event_assignments where user_id=(select auth.uid())
      )
    ));

create function pari_private.snapshot_commission() returns trigger language plpgsql set search_path='' as $$
begin
 select commission_per_ticket * new.quantity into new.commission_total from public.pari_events where id=new.event_id;
 return new;
end;
$$;
create trigger pari_snapshot_commission before insert on public.pari_ticket_orders
  for each row execute function pari_private.snapshot_commission();

-- Promote only the matching existing Auth user, never a self-reported profile email.
insert into public.pari_profiles(id,email,full_name,role)
select id,email,coalesce(raw_user_meta_data->>'full_name','Santiago'), 'admin'
from auth.users where lower(email)='rianorussi@gmail.com'
on conflict(id) do update set role='admin';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pari-receipts','pari-receipts',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']);

create policy pari_receipt_upload on storage.objects for insert to authenticated with check (
  bucket_id='pari-receipts' and exists (
    select 1 from public.pari_ticket_orders o
    where o.id::text=(storage.foldername(name))[1] and o.user_id=(select auth.uid())
      and o.payment_method='transfer' and o.status='pending' and o.receipt_path is null
      and o.reserved_until>now()
  )
);
create policy pari_receipt_read on storage.objects for select to authenticated using (
  bucket_id='pari-receipts' and exists (
    select 1 from public.pari_ticket_orders o where o.receipt_path=name
      and (o.user_id=(select auth.uid()) or pari_private.manages_event(o.event_id))
  )
);

create table pari_private.email_outbox (
  order_id uuid primary key references public.pari_ticket_orders(id) on delete cascade,
  recipient text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create function pari_private.managed_events() returns setof public.pari_events language plpgsql security definer set search_path='' as $$
begin
 return query select * from public.pari_events e
 where pari_private.manages_event(e.id) order by e.created_at desc;
end;
$$;
create function public.pari_managed_events() returns setof public.pari_events language sql security invoker set search_path='' as $$
 select pari_private.managed_events();
$$;
revoke all on function pari_private.managed_events(),public.pari_managed_events() from public,anon;
grant execute on function pari_private.managed_events(),public.pari_managed_events() to authenticated;

create function pari_private.reserve_transfer(p_event_id uuid,p_quantity integer,p_request_id uuid,p_name text,p_email text,p_phone text) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.pari_events; o public.pari_ticket_orders;
begin
 if auth.uid() is null or p_quantity is null or p_quantity not between 1 and 10 or p_request_id is null then
   raise exception 'Inicia sesión y selecciona de 1 a 10 boletos.';
 end if;
 if coalesce(length(trim(p_name)),0) not between 2 and 150 or coalesce(length(trim(p_email)),0)>254
    or coalesce(trim(p_email),'') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(p_phone)>30 then raise exception 'Revisa los datos del asistente.'; end if;
 select * into e from public.pari_events where id=p_event_id for update;
 select * into o from public.pari_ticket_orders where user_id=auth.uid() and request_id=p_request_id;
 if found then
   if o.event_id<>p_event_id or o.quantity<>p_quantity or o.payment_method<>'transfer' then
     raise exception 'Esta solicitud corresponde a otra orden.';
   end if;
   return to_jsonb(o);
 end if;
 if e.id is null or e.status<>'published' or e.starts_at<=now() or e.ticket_price is null then
   raise exception 'Este evento ya no está disponible.';
 end if;
 if e.ticket_inventory<p_quantity then raise exception 'No hay suficientes boletos disponibles.'; end if;
 insert into public.pari_ticket_orders(
   user_id,event_id,quantity,unit_price,total,status,is_demo,request_id,attendee_name,attendee_email,
   attendee_phone,payment_method,qr_token,transfer_details,reserved_until
 ) values (
   auth.uid(),e.id,p_quantity,e.ticket_price,e.ticket_price*p_quantity,'pending',
   e.transfer_clabe='000000000000000000',p_request_id,trim(p_name),lower(trim(p_email)),
   nullif(trim(p_phone),''),'transfer',null,
   jsonb_build_object('clabe',e.transfer_clabe,'holder',e.transfer_holder,'concept',e.transfer_concept),
   least(now()+interval '24 hours',e.starts_at)
 ) returning * into o;
 if e.ticket_inventory is not null then update public.pari_events set ticket_inventory=ticket_inventory-p_quantity where id=e.id; end if;
 return to_jsonb(o);
end;
$$;
create function public.pari_reserve_transfer(p_event_id uuid,p_quantity integer,p_request_id uuid,p_name text,p_email text,p_phone text) returns jsonb language sql security invoker set search_path='' as $$
 select pari_private.reserve_transfer(p_event_id,p_quantity,p_request_id,p_name,p_email,p_phone);
$$;
revoke all on function pari_private.reserve_transfer(uuid,integer,uuid,text,text,text),public.pari_reserve_transfer(uuid,integer,uuid,text,text,text) from public,anon;
grant execute on function pari_private.reserve_transfer(uuid,integer,uuid,text,text,text),public.pari_reserve_transfer(uuid,integer,uuid,text,text,text) to authenticated;

create function pari_private.submit_receipt(p_order_id uuid,p_path text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.pari_ticket_orders;
begin
 select * into o from public.pari_ticket_orders where id=p_order_id and user_id=auth.uid() for update;
 if not found or o.payment_method<>'transfer' then raise exception 'Apartado no encontrado.'; end if;
 if o.receipt_path=p_path then return to_jsonb(o); end if;
 if o.status<>'pending' or o.receipt_path is not null or o.reserved_until<=now() then
   raise exception 'Este apartado ya no admite comprobantes.';
 end if;
 if split_part(coalesce(p_path,''),'/',1)<>o.id::text or not exists (
   select 1 from storage.objects where bucket_id='pari-receipts' and name=p_path
 ) then raise exception 'Sube primero tu comprobante.'; end if;
 update public.pari_ticket_orders set receipt_path=p_path,receipt_submitted_at=now() where id=o.id returning * into o;
 return to_jsonb(o);
end;
$$;
create function public.pari_submit_receipt(p_order_id uuid,p_path text) returns jsonb language sql security invoker set search_path='' as $$
 select pari_private.submit_receipt(p_order_id,p_path);
$$;
revoke all on function pari_private.submit_receipt(uuid,text),public.pari_submit_receipt(uuid,text) from public,anon;
grant execute on function pari_private.submit_receipt(uuid,text),public.pari_submit_receipt(uuid,text) to authenticated;

create function pari_private.review_transfer(p_order_id uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
declare o public.pari_ticket_orders; e public.pari_events; target_id uuid;
begin
 select event_id into target_id from public.pari_ticket_orders where id=p_order_id;
 if target_id is null or not pari_private.manages_event(target_id) then raise exception 'Orden no disponible.'; end if;
 select * into e from public.pari_events where id=target_id for update;
 select * into o from public.pari_ticket_orders where id=p_order_id for update;
 if p_approve is null or o.payment_method<>'transfer' or o.status<>'pending' or o.receipt_path is null then
   raise exception 'Esta orden ya no está en revisión.';
 end if;
 if p_approve and e.status='cancelled' then raise exception 'El evento está cancelado.'; end if;
 update public.pari_ticket_orders set status=case when p_approve then 'paid' else 'cancelled' end,
  qr_token=case when p_approve then gen_random_uuid() end,reviewed_by=auth.uid(),reviewed_at=now() where id=o.id;
 if p_approve then
   if not o.is_demo then
     insert into pari_private.email_outbox(order_id,recipient)
     select o.id,email from auth.users where id=o.user_id and email is not null;
   end if;
 else
   update public.pari_events set ticket_inventory=ticket_inventory+o.quantity where id=e.id and ticket_inventory is not null;
 end if;
end;
$$;
create function public.pari_review_transfer(p_order_id uuid,p_approve boolean) returns void language sql security invoker set search_path='' as $$
 select pari_private.review_transfer(p_order_id,p_approve);
$$;
revoke all on function pari_private.review_transfer(uuid,boolean),public.pari_review_transfer(uuid,boolean) from public,anon;
grant execute on function pari_private.review_transfer(uuid,boolean),public.pari_review_transfer(uuid,boolean) to authenticated;

create function pari_private.expire_reservations() returns void language plpgsql security definer set search_path='' as $$
declare event_row record; released integer;
begin
 for event_row in
   select e.id from public.pari_events e where exists (
     select 1 from public.pari_ticket_orders o where o.event_id=e.id and o.payment_method='transfer'
       and o.status='pending' and o.receipt_path is null and o.reserved_until<=now()
   ) order by e.id for update skip locked
 loop
   with expired as (
     update public.pari_ticket_orders set status='cancelled'
     where event_id=event_row.id and payment_method='transfer' and status='pending'
       and receipt_path is null and reserved_until<=now() returning quantity
   ) select coalesce(sum(quantity),0) into released from expired;
   update public.pari_events set ticket_inventory=ticket_inventory+released
   where id=event_row.id and ticket_inventory is not null and released>0;
 end loop;
end;
$$;
revoke all on function pari_private.expire_reservations() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
