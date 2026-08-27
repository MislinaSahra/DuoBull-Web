create unique index if not exists profiles_username_unique_ci
on public.profiles (lower(trim(username)));

create unique index if not exists teams_name_unique_ci
on public.teams (lower(trim(name)));

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where lower(trim(username)) = lower(trim(candidate))
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
