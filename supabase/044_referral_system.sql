-- DuoBull kişisel referans sistemi
-- Supabase SQL Editor'de tek kez çalıştırın.

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

update public.profiles
set referral_code = upper(substr(md5(id::text), 1, 12))
where referral_code is null or btrim(referral_code) = '';

alter table public.profiles alter column referral_code set not null;
create unique index if not exists profiles_referral_code_unique
  on public.profiles (upper(referral_code));

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  reward_bp integer not null default 100 check (reward_bp >= 0),
  status text not null default 'rewarded' check (status in ('rewarded', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

drop policy if exists "users read own referrals" on public.referrals;
create policy "users read own referrals"
on public.referrals for select
to authenticated
using (referrer_id = (select auth.uid()));

create index if not exists referrals_referrer_created_idx
  on public.referrals (referrer_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_code text := upper(nullif(btrim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer_uuid uuid;
  reward_amount integer := 100;
begin
  insert into public.profiles (
    id, email, username, game, player_role, referral_code
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'game', ''), 'Valorant'),
    coalesce(nullif(new.raw_user_meta_data ->> 'player_role', ''), 'Düellocu'),
    upper(substr(md5(new.id::text), 1, 12))
  )
  on conflict (id) do update set
    email = excluded.email,
    username = excluded.username,
    game = excluded.game,
    player_role = excluded.player_role;

  if requested_code is not null then
    select id into referrer_uuid
    from public.profiles
    where upper(referral_code) = requested_code
      and id <> new.id
    limit 1;

    if referrer_uuid is not null then
      insert into public.referrals (referrer_id, referred_user_id, reward_bp)
      values (referrer_uuid, new.id, reward_amount)
      on conflict (referred_user_id) do nothing;

      if found then
        update public.profiles
        set balance = balance + reward_amount,
            updated_at = now()
        where id = referrer_uuid;

        update public.profiles
        set referred_by = referrer_uuid
        where id = new.id;

        insert into public.notifications (recipient_id, message, notification_type, is_read)
        values (
          referrer_uuid,
          'Referans bağlantınla yeni bir oyuncu kayıt oldu. ' || reward_amount || ' BP hesabına eklendi.',
          'referral_reward',
          false
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.get_my_referral_summary()
returns table (
  referral_code text,
  total_referrals bigint,
  rewarded_referrals bigint,
  earned_bp bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.referral_code,
    count(r.id),
    count(r.id) filter (where r.status = 'rewarded'),
    coalesce(sum(r.reward_bp) filter (where r.status = 'rewarded'), 0)::bigint
  from public.profiles p
  left join public.referrals r on r.referrer_id = p.id
  where p.id = (select auth.uid())
  group by p.referral_code;
$$;

revoke all on function public.get_my_referral_summary() from public;
grant execute on function public.get_my_referral_summary() to authenticated;
