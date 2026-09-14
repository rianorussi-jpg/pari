-- PARI · Supabase setup inicial
-- Ejecuta este archivo completo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.pari_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'client' check (role in ('client','business','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.pari_venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  city text not null default 'Ciudad de México',
  neighborhood text,
  address text,
  description text,
  phone text,
  contact_email text,
  cover_url text,
  logo_url text,
  instagram_url text,
  music text,
  promotion text,
  is_active boolean not null default true,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pari_venue_members (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.pari_venues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  unique (venue_id,user_id)
);

create table if not exists public.pari_venue_member_invites (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.pari_venues(id) on delete cascade,
  email text not null unique,
  role text not null default 'owner' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.pari_venue_photos (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.pari_venues(id) on delete cascade,
  image_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pari_venue_promotions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.pari_venues(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pari_events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.pari_venues(id) on delete set null,
  title text not null,
  description text,
  venue_name text,
  address text,
  city text not null default 'Ciudad de México',
  image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  ticket_price numeric(10,2),
  ticket_inventory integer,
  type text not null default 'party' check (type in ('club_event','party','festival','other')),
  status text not null default 'published' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.pari_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_id uuid not null references public.pari_venues(id) on delete cascade,
  event_id uuid references public.pari_events(id) on delete set null,
  reservation_date date not null,
  arrival_time time,
  party_size integer not null check (party_size > 0),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','checked_in','rejected')),
  qr_token uuid not null default gen_random_uuid(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pari_ticket_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.pari_events(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  qr_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.pari_wall_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  image_url text,
  venue_id uuid references public.pari_venues(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pari_wall_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.pari_wall_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pari_wall_likes (
  post_id uuid not null references public.pari_wall_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id,user_id)
);

-- Negocios iniciales. Las imágenes son placeholders editables desde la tabla pari_venues.
insert into public.pari_venues (id,name,slug,city,neighborhood,description,contact_email,cover_url,music,promotion,is_active,is_verified)
values
('11111111-1111-4111-8111-111111111111','Annua','annua','Ciudad de México','CDMX','Nightlife, reservaciones y eventos en Ciudad de México.','annua@pari.mx','https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1200&q=85','House · Open format','Acceso preferente sujeto a disponibilidad.',true,true),
('22222222-2222-4222-8222-222222222222','Faunna Rooftop','faunna-rooftop','Ciudad de México','CDMX','Rooftop, nightlife y eventos en Ciudad de México.','faunna@pari.mx','https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=85','Reggaetón · Hits','Reserva anticipada y recibe acceso prioritario para tu grupo.',true,true),
('33333333-3333-4333-8333-333333333333','Janis','janis','Ciudad de México','CDMX','Nightlife y reservaciones en Ciudad de México.','janis@pari.mx','https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85','Open format · House','Entrada preferente en reservaciones confirmadas.',true,true)
on conflict (slug) do update set
name=excluded.name,city=excluded.city,neighborhood=excluded.neighborhood,description=excluded.description,contact_email=excluded.contact_email,cover_url=excluded.cover_url,music=excluded.music,promotion=excluded.promotion,is_active=excluded.is_active,is_verified=excluded.is_verified;

insert into public.pari_venue_member_invites (venue_id,email,role) values
('11111111-1111-4111-8111-111111111111','annua@pari.mx','owner'),
('22222222-2222-4222-8222-222222222222','faunna@pari.mx','owner'),
('33333333-3333-4333-8333-333333333333','janis@pari.mx','owner')
on conflict (email) do update set venue_id=excluded.venue_id,role=excluded.role;

create or replace function public.pari_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare invitation record;
begin
  select * into invitation from public.pari_venue_member_invites where lower(email)=lower(new.email) limit 1;
  insert into public.pari_profiles (id,email,full_name,phone,role)
  values (new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),case when invitation.id is not null then 'business' else 'client' end)
  on conflict (id) do nothing;
  if invitation.id is not null then
    insert into public.pari_venue_members (venue_id,user_id,role) values (invitation.venue_id,new.id,invitation.role)
    on conflict (venue_id,user_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists pari_on_auth_user_created on auth.users;
create trigger pari_on_auth_user_created after insert on auth.users for each row execute procedure public.pari_handle_new_user();

alter table public.pari_profiles enable row level security;
alter table public.pari_venues enable row level security;
alter table public.pari_venue_members enable row level security;
alter table public.pari_venue_member_invites enable row level security;
alter table public.pari_venue_photos enable row level security;
alter table public.pari_venue_promotions enable row level security;
alter table public.pari_events enable row level security;
alter table public.pari_reservations enable row level security;
alter table public.pari_ticket_orders enable row level security;
alter table public.pari_wall_posts enable row level security;
alter table public.pari_wall_comments enable row level security;
alter table public.pari_wall_likes enable row level security;

-- Re-ejecutable: borrar políticas antes de recrearlas.
do $$ declare r record; begin
  for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('pari_profiles','pari_venues','pari_venue_members','pari_venue_member_invites','pari_venue_photos','pari_venue_promotions','pari_events','pari_reservations','pari_ticket_orders','pari_wall_posts','pari_wall_comments','pari_wall_likes') loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

create policy pari_profiles_read_own on public.pari_profiles for select to authenticated using (id=auth.uid());
create policy pari_profiles_update_own on public.pari_profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

create policy pari_venues_public_read on public.pari_venues for select to anon,authenticated using (is_active=true);
create policy pari_venue_members_read_own on public.pari_venue_members for select to authenticated using (user_id=auth.uid());
create policy pari_business_update_own_venue on public.pari_venues for update to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venues.id and vm.user_id=auth.uid()));

create policy pari_venue_photos_public_read on public.pari_venue_photos for select to anon,authenticated using (true);
create policy pari_venue_photos_business_insert on public.pari_venue_photos for insert to authenticated with check (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_photos.venue_id and vm.user_id=auth.uid()));
create policy pari_venue_photos_business_update on public.pari_venue_photos for update to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_photos.venue_id and vm.user_id=auth.uid()));
create policy pari_venue_photos_business_delete on public.pari_venue_photos for delete to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_photos.venue_id and vm.user_id=auth.uid()));

create policy pari_promotions_public_read on public.pari_venue_promotions for select to anon,authenticated using (is_active=true or exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_promotions.venue_id and vm.user_id=auth.uid()));
create policy pari_promotions_business_insert on public.pari_venue_promotions for insert to authenticated with check (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_promotions.venue_id and vm.user_id=auth.uid()));
create policy pari_promotions_business_update on public.pari_venue_promotions for update to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_promotions.venue_id and vm.user_id=auth.uid()));
create policy pari_promotions_business_delete on public.pari_venue_promotions for delete to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_venue_promotions.venue_id and vm.user_id=auth.uid()));

create policy pari_events_public_read on public.pari_events for select to anon,authenticated using (status='published' or exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_events.venue_id and vm.user_id=auth.uid()));
create policy pari_events_business_insert on public.pari_events for insert to authenticated with check (venue_id is not null and exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_events.venue_id and vm.user_id=auth.uid()));
create policy pari_events_business_update on public.pari_events for update to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_events.venue_id and vm.user_id=auth.uid()));
create policy pari_events_business_delete on public.pari_events for delete to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_events.venue_id and vm.user_id=auth.uid()));

create policy pari_reservations_user_insert on public.pari_reservations for insert to authenticated with check (user_id=auth.uid());
create policy pari_reservations_user_or_business_read on public.pari_reservations for select to authenticated using (user_id=auth.uid() or exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_reservations.venue_id and vm.user_id=auth.uid()));
create policy pari_reservations_user_cancel on public.pari_reservations for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy pari_reservations_business_update on public.pari_reservations for update to authenticated using (exists(select 1 from public.pari_venue_members vm where vm.venue_id=pari_reservations.venue_id and vm.user_id=auth.uid()));

create policy pari_tickets_user_insert on public.pari_ticket_orders for insert to authenticated with check (user_id=auth.uid());
create policy pari_tickets_user_read on public.pari_ticket_orders for select to authenticated using (user_id=auth.uid());

create policy pari_wall_posts_read on public.pari_wall_posts for select to anon,authenticated using (true);
create policy pari_wall_posts_insert on public.pari_wall_posts for insert to authenticated with check (user_id=auth.uid());
create policy pari_wall_posts_delete on public.pari_wall_posts for delete to authenticated using (user_id=auth.uid());
create policy pari_wall_comments_read on public.pari_wall_comments for select to anon,authenticated using (true);
create policy pari_wall_comments_insert on public.pari_wall_comments for insert to authenticated with check (user_id=auth.uid());
create policy pari_wall_comments_delete on public.pari_wall_comments for delete to authenticated using (user_id=auth.uid());
create policy pari_wall_likes_read on public.pari_wall_likes for select to anon,authenticated using (true);
create policy pari_wall_likes_insert on public.pari_wall_likes for insert to authenticated with check (user_id=auth.uid());
create policy pari_wall_likes_delete on public.pari_wall_likes for delete to authenticated using (user_id=auth.uid());

-- Si las cuentas de negocio ya existían antes de correr este SQL, sincronízalas también:
insert into public.pari_profiles (id,email,full_name,role)
select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',''),'business'
from auth.users u
join public.pari_venue_member_invites i on lower(i.email)=lower(u.email)
on conflict (id) do update set role='business',email=excluded.email;

insert into public.pari_venue_members (venue_id,user_id,role)
select i.venue_id,u.id,i.role
from auth.users u
join public.pari_venue_member_invites i on lower(i.email)=lower(u.email)
on conflict (venue_id,user_id) do nothing;
