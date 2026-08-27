create table if not exists public.products (
  id text primary key,
  name text not null unique,
  product_type text not null,
  category text not null,
  price_bp integer not null check (price_bp >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.products (id, name, product_type, category, price_bp, stock_count, image_url) values
('razer-gold', 'Razer Gold', '100 TL', 'dijital-kartlar', 10000, 72, '/products/razer-gold.svg'),
('google-play', 'Google Play', '100 TL', 'dijital-kartlar', 10000, 80, '/products/google-play.svg'),
('app-store', 'App Store', '100 TL', 'dijital-kartlar', 10000, 65, '/products/app-store.svg'),
('pubg-mobile', 'PUBG Mobile', '300 UC', 'oyun-kodlari', 12000, 55, '/products/pubg-mobile.svg'),
('valorant-vp', 'Valorant VP', '475 VP', 'oyun-kodlari', 12000, 101, '/products/valorant.svg')
on conflict (id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_bp integer not null check (total_bp >= 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  delivery_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  product_name text not null,
  product_type text not null,
  unit_price_bp integer not null,
  quantity integer not null default 1 check (quantity > 0)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  category text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index if not exists friend_requests_pending_pair_unique
on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
where status = 'pending';

create table if not exists public.friendships (
  user_one uuid not null references public.profiles(id) on delete cascade,
  user_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_one, user_two),
  check (user_one < user_two)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.tournament_messages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id text primary key,
  title text not null,
  bp_reward integer not null check (bp_reward >= 0),
  xp_reward integer not null check (xp_reward >= 0),
  target integer not null default 1 check (target > 0),
  is_active boolean not null default true
);

insert into public.missions (id, title, bp_reward, xp_reward, target) values
('win-one-match', '1 maç kazan', 100, 120, 1),
('play-three-matches', '3 maç oyna', 150, 180, 3),
('join-tournament', 'Takımınla 1 turnuvaya katıl', 250, 300, 1),
('invite-friend', 'Arkadaşını DuoBull''a davet et', 200, 220, 1)
on conflict (id) do update set title = excluded.title, bp_reward = excluded.bp_reward, xp_reward = excluded.xp_reward, target = excluded.target;

create table if not exists public.user_missions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.missions(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  is_claimed boolean not null default false,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_replies enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;
alter table public.team_messages enable row level security;
alter table public.tournament_messages enable row level security;
alter table public.missions enable row level security;
alter table public.user_missions enable row level security;

create policy "authenticated view active products" on public.products for select to authenticated using (is_active or public.is_admin());
create policy "users and admins view orders" on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "users and admins view order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or public.is_admin())));
create policy "users create tickets" on public.support_tickets for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owners and admins view tickets" on public.support_tickets for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "owners and admins delete closed tickets" on public.support_tickets for delete to authenticated using ((user_id = (select auth.uid()) and status = 'closed') or public.is_admin());
create policy "owners and admins view replies" on public.support_replies for select to authenticated using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = (select auth.uid()) or public.is_admin())));
create policy "admins reply tickets" on public.support_replies for insert to authenticated with check (public.is_admin() and admin_id = (select auth.uid()));
create policy "request participants view requests" on public.friend_requests for select to authenticated using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy "users send friend requests" on public.friend_requests for insert to authenticated with check (sender_id = (select auth.uid()) and status = 'pending');
create policy "friends view friendships" on public.friendships for select to authenticated using (user_one = (select auth.uid()) or user_two = (select auth.uid()));
create policy "friends read direct messages" on public.direct_messages for select to authenticated using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy "friends send direct messages" on public.direct_messages for insert to authenticated with check (sender_id = (select auth.uid()) and exists (select 1 from public.friendships f where f.user_one = least(sender_id, receiver_id) and f.user_two = greatest(sender_id, receiver_id)));
create policy "team members read messages" on public.team_messages for select to authenticated using (public.is_team_member(team_id));
create policy "team members send messages" on public.team_messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_team_member(team_id));
create policy "tournament participants read messages" on public.tournament_messages for select to authenticated using (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())) or exists (select 1 from public.tournament_applications a where a.tournament_id = tournament_messages.tournament_id and a.applicant_id = (select auth.uid()) and a.status = 'approved'));
create policy "tournament participants send messages" on public.tournament_messages for insert to authenticated with check (sender_id = (select auth.uid()) and (exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = (select auth.uid())) or exists (select 1 from public.tournament_applications a where a.tournament_id = tournament_messages.tournament_id and a.applicant_id = (select auth.uid()) and a.status = 'approved')));
create policy "authenticated view missions" on public.missions for select to authenticated using (is_active);
create policy "users view own mission progress" on public.user_missions for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.checkout(product_ids text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare product_id text; product_row public.products; calculated_total integer := 0; created_order uuid;
begin
  if array_length(product_ids, 1) is null then raise exception 'Sepet boş'; end if;
  foreach product_id in array product_ids loop
    select * into product_row from public.products where id = product_id and is_active for update;
    if product_row.id is null then raise exception 'Ürün bulunamadı'; end if;
    if product_row.stock_count < 1 then raise exception '% stokta yok', product_row.name; end if;
    calculated_total := calculated_total + product_row.price_bp;
  end loop;
  update public.profiles set balance = balance - calculated_total
  where id = (select auth.uid()) and balance >= calculated_total;
  if not found then raise exception 'Bull Puan bakiyen yetersiz'; end if;
  insert into public.orders (user_id, total_bp) values ((select auth.uid()), calculated_total) returning id into created_order;
  foreach product_id in array product_ids loop
    select * into product_row from public.products where id = product_id;
    insert into public.order_items (order_id, product_id, product_name, product_type, unit_price_bp)
    values (created_order, product_row.id, product_row.name, product_row.product_type, product_row.price_bp);
    update public.products set stock_count = stock_count - 1, updated_at = now() where id = product_id;
  end loop;
  return created_order;
end; $$;

create or replace function public.adjust_product_stock(target_product_id text, delta integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare new_stock integer;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  update public.products set stock_count = stock_count + delta, updated_at = now()
  where id = target_product_id and stock_count + delta >= 0 returning stock_count into new_stock;
  if new_stock is null then raise exception 'Ürün bulunamadı veya stok yetersiz'; end if;
  return new_stock;
end; $$;

create or replace function public.deliver_order(target_order_id uuid, code text)
returns void language plpgsql security definer set search_path = '' as $$
declare customer uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if length(trim(code)) = 0 then raise exception 'Ürün kodu zorunlu'; end if;
  update public.orders set delivery_code = trim(code), status = 'completed', completed_at = now()
  where id = target_order_id and status = 'pending' returning user_id into customer;
  if customer is null then raise exception 'Bekleyen sipariş bulunamadı'; end if;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (customer, 'Siparişiniz tamamlandı, ürün kodunuz: ' || trim(code), 'order_completed', target_order_id);
end; $$;

create or replace function public.review_friend_request(request_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare request_row public.friend_requests; first_user uuid; second_user uuid;
begin
  if decision not in ('approved', 'rejected') then raise exception 'Geçersiz karar'; end if;
  select * into request_row from public.friend_requests where id = request_id and receiver_id = (select auth.uid());
  if request_row.id is null then raise exception 'İstek bulunamadı'; end if;
  update public.friend_requests set status = decision, reviewed_at = now() where id = request_id;
  if decision = 'approved' then
    first_user := least(request_row.sender_id, request_row.receiver_id); second_user := greatest(request_row.sender_id, request_row.receiver_id);
    insert into public.friendships (user_one, user_two) values (first_user, second_user) on conflict do nothing;
    insert into public.notifications (recipient_id, message, notification_type, entity_id)
    values (request_row.sender_id, 'Arkadaşlık isteğiniz onaylandı.', 'friend_approved', request_row.id);
  end if;
end; $$;

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sender_name text;
begin
  select username into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (new.receiver_id, sender_name || ' size arkadaşlık isteği gönderdi.', 'friend_request', new.id);
  return new;
end; $$;

drop trigger if exists on_friend_request_notify on public.friend_requests;
create trigger on_friend_request_notify after insert on public.friend_requests
for each row execute procedure public.notify_friend_request();

create or replace function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sender_name text;
begin
  select username into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (new.receiver_id, sender_name || ' size yeni bir mesaj gönderdi.', 'direct_message', new.id);
  return new;
end; $$;

drop trigger if exists on_direct_message_notify on public.direct_messages;
create trigger on_direct_message_notify after insert on public.direct_messages
for each row execute procedure public.notify_direct_message();

create or replace function public.remove_friend(friend_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships where user_one = least((select auth.uid()), friend_id) and user_two = greatest((select auth.uid()), friend_id);
  update public.friend_requests set status = 'removed', reviewed_at = now()
  where least(sender_id, receiver_id) = least((select auth.uid()), friend_id) and greatest(sender_id, receiver_id) = greatest((select auth.uid()), friend_id);
end; $$;

create or replace function public.reply_support_ticket(target_ticket_id uuid, reply_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare customer uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  insert into public.support_replies (ticket_id, admin_id, message) values (target_ticket_id, (select auth.uid()), trim(reply_message));
  update public.support_tickets set status = 'answered' where id = target_ticket_id returning user_id into customer;
  insert into public.notifications (recipient_id, message, notification_type, entity_id)
  values (customer, 'Destek talebiniz yanıtlandı.', 'support_reply', target_ticket_id);
end; $$;

create or replace function public.claim_mission(target_mission_id text)
returns table(balance integer, loyalty_xp integer) language plpgsql security definer set search_path = '' as $$
declare mission_row public.missions; progress_row public.user_missions;
begin
  select * into mission_row from public.missions where id = target_mission_id and is_active;
  select * into progress_row from public.user_missions where user_id = (select auth.uid()) and mission_id = target_mission_id for update;
  if mission_row.id is null or progress_row.progress < mission_row.target or progress_row.is_claimed then raise exception 'Görev ödülü alınamaz'; end if;
  update public.user_missions set is_claimed = true, claimed_at = now(), updated_at = now() where user_id = (select auth.uid()) and mission_id = target_mission_id;
  return query update public.profiles set balance = profiles.balance + mission_row.bp_reward, loyalty_xp = profiles.loyalty_xp + mission_row.xp_reward where id = (select auth.uid()) returning profiles.balance, profiles.loyalty_xp;
end; $$;

create or replace function public.assign_wallet(target_user_id uuid, balance_delta integer default 0, xp_delta integer default 0)
returns table(balance integer, loyalty_xp integer) language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if balance_delta < 0 or xp_delta < 0 then raise exception 'Negatif değer tanımlanamaz'; end if;
  return query update public.profiles
  set balance = profiles.balance + balance_delta, loyalty_xp = profiles.loyalty_xp + xp_delta
  where id = target_user_id returning profiles.balance, profiles.loyalty_xp;
end; $$;

create or replace function public.close_support_ticket(target_ticket_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.support_tickets set status = 'closed', closed_at = now()
  where id = target_ticket_id and (user_id = (select auth.uid()) or public.is_admin());
end; $$;

create or replace function public.seed_user_missions()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_missions (user_id, mission_id, progress)
  select new.id, m.id, 0 from public.missions m where m.is_active
  on conflict (user_id, mission_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_profile_created_seed_missions on public.profiles;
create trigger on_profile_created_seed_missions after insert on public.profiles
for each row execute procedure public.seed_user_missions();

grant execute on function public.checkout(text[]) to authenticated;
grant execute on function public.adjust_product_stock(text, integer) to authenticated;
grant execute on function public.deliver_order(uuid, text) to authenticated;
grant execute on function public.review_friend_request(uuid, text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;
grant execute on function public.claim_mission(text) to authenticated;
grant execute on function public.assign_wallet(uuid, integer, integer) to authenticated;
grant execute on function public.close_support_ticket(uuid) to authenticated;

insert into public.user_missions (user_id, mission_id, progress)
select p.id, m.id, case m.id when 'win-one-match' then 1 when 'play-three-matches' then 2 else 0 end
from public.profiles p cross join public.missions m
where m.is_active
on conflict (user_id, mission_id) do nothing;

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.support_tickets;
alter publication supabase_realtime add table public.support_replies;
alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.team_messages;
alter publication supabase_realtime add table public.tournament_messages;
alter publication supabase_realtime add table public.user_missions;
