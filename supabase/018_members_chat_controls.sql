-- Member administration and direct-message controls.

alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists suspended_until timestamptz;
do $$ begin
  alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active','suspended'));
exception when duplicate_object then null; end $$;

create or replace function public.admin_update_member(target_user_id uuid, next_username text, next_role text, next_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if next_role not in ('user','admin') or next_status not in ('active','suspended') then raise exception 'Geçersiz üye bilgisi'; end if;
  if target_user_id = (select auth.uid()) and next_status = 'suspended' then raise exception 'Kendi hesabınızı askıya alamazsınız'; end if;
  update public.profiles set username=trim(next_username), role=next_role, account_status=next_status,
    suspended_until=case when next_status='suspended' then 'infinity'::timestamptz else null end, updated_at=now()
  where id=target_user_id;
end $$;

alter table public.direct_messages add column if not exists delivered_at timestamptz not null default now();
alter table public.direct_messages add column if not exists seen_at timestamptz;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id)
);
create table if not exists public.direct_conversation_clears (
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_user_id uuid not null references public.profiles(id) on delete cascade,
  cleared_at timestamptz not null default now(),
  primary key(user_id,other_user_id), check(user_id <> other_user_id)
);
alter table public.user_blocks enable row level security;
alter table public.direct_conversation_clears enable row level security;
create policy "users view own blocks" on public.user_blocks for select to authenticated using (blocker_id=(select auth.uid()) or blocked_id=(select auth.uid()));
create policy "users manage own blocks" on public.user_blocks for all to authenticated using (blocker_id=(select auth.uid())) with check (blocker_id=(select auth.uid()));
create policy "users view own clears" on public.direct_conversation_clears for select to authenticated using (user_id=(select auth.uid()));
create policy "users manage own clears" on public.direct_conversation_clears for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create or replace function public.guard_direct_message_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.receiver_id) or (blocker_id=new.receiver_id and blocked_id=new.sender_id)) then
    raise exception 'Bu kullanıcıyla mesajlaşma engellendi';
  end if;
  return new;
end $$;
drop trigger if exists before_direct_message_block_guard on public.direct_messages;
create trigger before_direct_message_block_guard before insert on public.direct_messages for each row execute procedure public.guard_direct_message_block();

create or replace function public.mark_direct_messages_seen(other_user uuid)
returns void language sql security definer set search_path = '' as $$
  update public.direct_messages set seen_at=coalesce(seen_at,now())
  where sender_id=other_user and receiver_id=(select auth.uid()) and seen_at is null
$$;
create or replace function public.clear_direct_conversation(other_user uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.direct_conversation_clears(user_id,other_user_id,cleared_at) values((select auth.uid()),other_user,now())
  on conflict(user_id,other_user_id) do update set cleared_at=excluded.cleared_at
$$;
create or replace function public.set_user_block(other_user uuid, should_block boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if should_block then insert into public.user_blocks(blocker_id,blocked_id) values((select auth.uid()),other_user) on conflict do nothing;
  else delete from public.user_blocks where blocker_id=(select auth.uid()) and blocked_id=other_user; end if;
end $$;

grant execute on function public.admin_update_member(uuid,text,text,text) to authenticated;
grant execute on function public.mark_direct_messages_seen(uuid) to authenticated;
grant execute on function public.clear_direct_conversation(uuid) to authenticated;
grant execute on function public.set_user_block(uuid,boolean) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_blocks') then alter publication supabase_realtime add table public.user_blocks; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_conversation_clears') then alter publication supabase_realtime add table public.direct_conversation_clears; end if;
end $$;
