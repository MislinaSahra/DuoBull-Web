create extension if not exists pgcrypto with schema extensions;
create table if not exists public.mfa_recovery_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id,code_hash)
);
alter table public.mfa_recovery_codes enable row level security;

create or replace function public.replace_mfa_recovery_codes(p_codes text[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or coalesce(array_length(p_codes,1),0) not between 8 and 10 then raise exception 'Geçersiz kurtarma kodları'; end if;
  delete from public.mfa_recovery_codes where user_id=auth.uid();
  insert into public.mfa_recovery_codes(user_id,code_hash)
  select auth.uid(),encode(extensions.digest(upper(trim(code)),'sha256'),'hex') from unnest(p_codes) code;
end $$;

create or replace function public.consume_mfa_recovery_code(p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare target_id bigint;
begin
  if auth.uid() is null then return false; end if;
  select id into target_id from public.mfa_recovery_codes
  where user_id=auth.uid() and used_at is null and code_hash=encode(extensions.digest(upper(trim(p_code)),'sha256'),'hex') for update skip locked limit 1;
  if target_id is null then return false; end if;
  update public.mfa_recovery_codes set used_at=now() where id=target_id;
  delete from auth.mfa_factors where user_id=auth.uid();
  return true;
end $$;
revoke all on function public.replace_mfa_recovery_codes(text[]) from public;
revoke all on function public.consume_mfa_recovery_code(text) from public;
grant execute on function public.replace_mfa_recovery_codes(text[]) to authenticated;
grant execute on function public.consume_mfa_recovery_code(text) to authenticated;
