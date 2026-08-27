create or replace function public.add_team_captain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (team_id, user_id, member_role, rank)
  values (new.id, new.captain_id, new.wanted_role, new.level);
  return new;
end;
$$;

comment on function public.add_team_captain() is
  'Takım oluşturulurken kaptanı, formda seçtiği oyun rolüyle kadroya ekler.';
