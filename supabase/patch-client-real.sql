-- Pari: parche para clientes/Auth reales sobre una DB ya inicializada
-- Se puede correr después de setup.sql.

create or replace function public.pari_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare invitation record;
begin
  select * into invitation
  from public.pari_venue_member_invites
  where lower(email)=lower(new.email)
  limit 1;

  insert into public.pari_profiles (id,email,full_name,phone,role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    case when invitation.id is not null then 'business' else 'client' end
  )
  on conflict (id) do update set
    email=excluded.email,
    full_name=case when public.pari_profiles.full_name='' then excluded.full_name else public.pari_profiles.full_name end,
    phone=case when coalesce(public.pari_profiles.phone,'')='' then excluded.phone else public.pari_profiles.phone end;

  if invitation.id is not null then
    insert into public.pari_venue_members (venue_id,user_id,role)
    values (invitation.venue_id,new.id,invitation.role)
    on conflict (venue_id,user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists pari_on_auth_user_created on auth.users;
create trigger pari_on_auth_user_created
after insert on auth.users
for each row execute procedure public.pari_handle_new_user();
