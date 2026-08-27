create table if not exists public.tournament_formats (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournament_formats enable row level security;
create policy "authenticated users view tournament formats" on public.tournament_formats for select to authenticated using (true);
create policy "admins manage tournament formats" on public.tournament_formats for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.tournament_formats to authenticated;
grant insert, update, delete on public.tournament_formats to authenticated;

alter table public.tournament_requests add column if not exists format_id uuid references public.tournament_formats(id) on delete set null;
alter table public.tournament_requests add column if not exists format_name text not null default '';
alter table public.tournaments add column if not exists format_id uuid references public.tournament_formats(id) on delete set null;
alter table public.tournaments add column if not exists format_name text not null default '';

create or replace function public.review_tournament_request(request_id uuid, decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare request_row public.tournament_requests; created_tournament_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  select request.* into request_row from public.tournament_requests request where request.id = review_tournament_request.request_id for update;
  if request_row.id is null then raise exception 'Talep bulunamadı'; end if;
  update public.tournament_requests request set status=decision,reviewed_at=now() where request.id=review_tournament_request.request_id;
  if decision='approved' then
    insert into public.tournaments(owner_id,request_id,name,game,prize,tournament_date,participant_limit,format_id,format_name,status,published_at)
    values(request_row.requester_id,request_row.id,request_row.name,request_row.game,request_row.prize,request_row.tournament_date,request_row.participant_limit,request_row.format_id,request_row.format_name,'published',now())
    on conflict on constraint tournaments_request_id_key do update set status='published',published_at=now(),format_id=excluded.format_id,format_name=excluded.format_name
    returning public.tournaments.id into created_tournament_id;
    insert into public.notifications(recipient_id,message,notification_type,entity_id) values(request_row.requester_id,request_row.name||' turnuva talebiniz onaylandı ve yayınlandı.','tournament_request_review',created_tournament_id);
  else
    insert into public.notifications(recipient_id,message,notification_type,entity_id) values(request_row.requester_id,request_row.name||' turnuva talebiniz reddedildi.','tournament_request_review',request_row.id);
  end if;
  return created_tournament_id;
end $$;

grant execute on function public.review_tournament_request(uuid,text) to authenticated;
