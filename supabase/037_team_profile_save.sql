create or replace function public.save_team_profile(
  target_team uuid,
  next_logo_url text,
  next_banner_url text,
  next_motto text,
  next_description text
)
returns public.teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_team public.teams;
begin
  if not exists (
    select 1 from public.teams t
    where t.id = target_team
      and (t.captain_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Bu takım profilini düzenleme yetkiniz yok.';
  end if;

  update public.teams
  set logo_url = coalesce(next_logo_url, ''),
      banner_url = coalesce(next_banner_url, ''),
      motto = coalesce(next_motto, ''),
      profile_description = coalesce(next_description, '')
  where id = target_team
  returning * into saved_team;

  return saved_team;
end;
$$;

grant execute on function public.save_team_profile(uuid,text,text,text,text) to authenticated;
