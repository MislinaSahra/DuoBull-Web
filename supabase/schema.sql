create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null,
  game text not null default 'Valorant',
  player_role text not null default 'Düellocu',
  region text not null default 'Türkiye',
  discord text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  balance integer not null default 0 check (balance >= 0),
  loyalty_xp integer not null default 0 check (loyalty_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "authenticated users can view profiles"
on public.profiles for select to authenticated
using (true);

create policy "users can insert their own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id and role = 'user');

create policy "users can update their own public profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke update on public.profiles from authenticated;
grant update (username, game, player_role, region, discord, bio, avatar_url, updated_at) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, username, game, player_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'game', 'Valorant'),
    coalesce(new.raw_user_meta_data ->> 'player_role', 'Düellocu')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.delete_my_account()
returns void
language sql
security definer set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
