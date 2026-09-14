-- PARI · PATCH OPERACIÓN COMPLETA
-- Ejecuta este archivo una sola vez DESPUÉS de supabase/setup.sql y patch-client-real.sql.

-- 1) Configuración de reservas por negocio
alter table public.pari_venues
  add column if not exists auto_accept_reservations boolean not null default false;

-- Janis inicia con confirmación automática; cada negocio puede cambiarlo desde su panel.
update public.pari_venues
set auto_accept_reservations = true
where lower(slug) = 'janis' or lower(name) = 'janis';

-- 2) Storage público para avatars, portadas y galería
insert into storage.buckets (id, name, public)
values ('pari-media', 'pari-media', true)
on conflict (id) do update set public = true;

-- Lectura pública de medios Pari
drop policy if exists "pari_media_public_read" on storage.objects;
create policy "pari_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'pari-media');

-- Usuarios autenticados pueden manejar su avatar
drop policy if exists "pari_avatar_insert_own" on storage.objects;
create policy "pari_avatar_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "pari_avatar_update_own" on storage.objects;
create policy "pari_avatar_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "pari_avatar_delete_own" on storage.objects;
create policy "pari_avatar_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Miembros de un negocio pueden cargar medios en /venues/{venue_id}/...
drop policy if exists "pari_venue_media_insert" on storage.objects;
create policy "pari_venue_media_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'venues'
  and exists (
    select 1 from public.pari_venue_members vm
    where vm.user_id = auth.uid()
      and vm.venue_id::text = (storage.foldername(name))[2]
  )
);

drop policy if exists "pari_venue_media_update" on storage.objects;
create policy "pari_venue_media_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'venues'
  and exists (
    select 1 from public.pari_venue_members vm
    where vm.user_id = auth.uid()
      and vm.venue_id::text = (storage.foldername(name))[2]
  )
)
with check (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'venues'
  and exists (
    select 1 from public.pari_venue_members vm
    where vm.user_id = auth.uid()
      and vm.venue_id::text = (storage.foldername(name))[2]
  )
);

drop policy if exists "pari_venue_media_delete" on storage.objects;
create policy "pari_venue_media_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pari-media'
  and (storage.foldername(name))[1] = 'venues'
  and exists (
    select 1 from public.pari_venue_members vm
    where vm.user_id = auth.uid()
      and vm.venue_id::text = (storage.foldername(name))[2]
  )
);

-- 3) Negocio: lectura de su membresía
drop policy if exists "pari_members_read_own" on public.pari_venue_members;
create policy "pari_members_read_own"
on public.pari_venue_members for select
to authenticated
using (user_id = auth.uid());

-- 4) Negocio: administrar fotos
drop policy if exists "pari_business_insert_photos" on public.pari_venue_photos;
create policy "pari_business_insert_photos"
on public.pari_venue_photos for insert
to authenticated
with check (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_photos.venue_id
));

drop policy if exists "pari_business_update_photos" on public.pari_venue_photos;
create policy "pari_business_update_photos"
on public.pari_venue_photos for update
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_photos.venue_id
));

drop policy if exists "pari_business_delete_photos" on public.pari_venue_photos;
create policy "pari_business_delete_photos"
on public.pari_venue_photos for delete
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_photos.venue_id
));

-- 5) Negocio: administrar promociones
drop policy if exists "pari_business_insert_promotions" on public.pari_venue_promotions;
create policy "pari_business_insert_promotions"
on public.pari_venue_promotions for insert
to authenticated
with check (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_promotions.venue_id
));

drop policy if exists "pari_business_update_promotions" on public.pari_venue_promotions;
create policy "pari_business_update_promotions"
on public.pari_venue_promotions for update
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_promotions.venue_id
));

drop policy if exists "pari_business_delete_promotions" on public.pari_venue_promotions;
create policy "pari_business_delete_promotions"
on public.pari_venue_promotions for delete
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_venue_promotions.venue_id
));

-- 6) Negocio: administrar eventos propios
drop policy if exists "pari_business_read_own_events" on public.pari_events;
create policy "pari_business_read_own_events"
on public.pari_events for select
to authenticated
using (
  status = 'published'
  or exists (
    select 1 from public.pari_venue_members vm
    where vm.user_id = auth.uid() and vm.venue_id = pari_events.venue_id
  )
);

drop policy if exists "pari_business_insert_events" on public.pari_events;
create policy "pari_business_insert_events"
on public.pari_events for insert
to authenticated
with check (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_events.venue_id
));

drop policy if exists "pari_business_update_events" on public.pari_events;
create policy "pari_business_update_events"
on public.pari_events for update
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_events.venue_id
));

drop policy if exists "pari_business_delete_events" on public.pari_events;
create policy "pari_business_delete_events"
on public.pari_events for delete
to authenticated
using (exists (
  select 1 from public.pari_venue_members vm
  where vm.user_id = auth.uid() and vm.venue_id = pari_events.venue_id
));

-- 7) Muro: vista pública que SOLO expone nombre/avatar, no correo ni teléfono
drop policy if exists "pari_profiles_public_basic_read" on public.pari_profiles;
drop view if exists public.pari_public_profiles;
create view public.pari_public_profiles as
select id, full_name, avatar_url
from public.pari_profiles;
grant select on public.pari_public_profiles to anon, authenticated;

-- 8) Admin: helper seguro por rol
create or replace function public.pari_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pari_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Acceso administrativo a las tablas principales
-- Las policies públicas/propias siguen coexistiendo.
do $$
declare
  t text;
begin
  foreach t in array array[
    'pari_profiles','pari_venues','pari_venue_members','pari_venue_photos',
    'pari_venue_promotions','pari_events','pari_reservations','pari_ticket_orders',
    'pari_wall_posts','pari_wall_comments','pari_wall_likes'
  ] loop
    execute format('drop policy if exists "pari_admin_all_%s" on public.%I', t, t);
    execute format('create policy "pari_admin_all_%s" on public.%I for all to authenticated using (public.pari_is_admin()) with check (public.pari_is_admin())', t, t);
  end loop;
end $$;

-- IMPORTANTE: para convertir una cuenta en administrador, primero créala en Auth y luego ejecuta:
-- update public.pari_profiles set role='admin' where email='TU_CORREO@DOMINIO.COM';

-- 9) Seguridad: el estado inicial de una reserva lo decide la BD, no el cliente
create or replace function public.pari_set_initial_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auto_mode boolean;
begin
  select auto_accept_reservations into auto_mode
  from public.pari_venues
  where id = new.venue_id;

  new.status := case when coalesce(auto_mode,false) then 'confirmed' else 'pending' end;
  return new;
end;
$$;

drop trigger if exists pari_reservation_initial_status on public.pari_reservations;
create trigger pari_reservation_initial_status
before insert on public.pari_reservations
for each row execute function public.pari_set_initial_reservation_status();
