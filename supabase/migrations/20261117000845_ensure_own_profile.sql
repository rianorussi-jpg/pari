-- Repair only the caller's missing profile; never infer privileges from metadata.
begin;
create or replace function pari_private.ensure_my_profile() returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_user_id uuid:=auth.uid(); result public.pari_profiles;
begin
 if current_user_id is null then raise exception 'Inicia sesión para cargar tu perfil.';end if;
 insert into public.pari_profiles(id,email,full_name,phone,role)
 select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',''),coalesce(u.raw_user_meta_data->>'phone',''),'client'
 from auth.users u where u.id=current_user_id
 on conflict(id) do nothing;
 select * into result from public.pari_profiles where id=current_user_id;
 if not found then raise exception 'No se encontró la cuenta autenticada.';end if;
 return to_jsonb(result);
end;$$;
create or replace function public.pari_ensure_my_profile() returns jsonb
language sql security invoker set search_path='' as $$select pari_private.ensure_my_profile();$$;
revoke all on function pari_private.ensure_my_profile(),public.pari_ensure_my_profile() from public,anon;
grant execute on function pari_private.ensure_my_profile(),public.pari_ensure_my_profile() to authenticated;
notify pgrst,'reload schema';
commit;
