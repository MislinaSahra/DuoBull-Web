drop policy if exists "members view team roster" on public.team_members;
drop policy if exists "approved team rosters are visible" on public.team_members;
create policy "approved team rosters are visible" on public.team_members
for select to authenticated using (
  user_id=(select auth.uid()) or public.is_admin() or public.is_team_member(team_id)
  or exists(select 1 from public.teams t where t.id=team_id and t.status='approved')
);
