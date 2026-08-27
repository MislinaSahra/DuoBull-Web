-- Kullanıcı bazlı referral ödülü. "percent", varsayılan 100 BP üzerinden hesaplanır.
alter table public.profiles
  add column if not exists referral_reward_type text not null default 'fixed'
    check (referral_reward_type in ('fixed', 'percent')),
  add column if not exists referral_reward_value numeric(10,2) not null default 100
    check (referral_reward_value >= 0);

create or replace function public.admin_set_referral_reward(p_user_id uuid, p_reward_type text, p_reward_value numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz işlem'; end if;
  if p_reward_type not in ('fixed','percent') or p_reward_value < 0 then raise exception 'Geçersiz ödül ayarı'; end if;
  update public.profiles set referral_reward_type=p_reward_type, referral_reward_value=p_reward_value, updated_at=now() where id=p_user_id;
  if not found then raise exception 'Kullanıcı bulunamadı'; end if;
end; $$;
revoke all on function public.admin_set_referral_reward(uuid,text,numeric) from public;
grant execute on function public.admin_set_referral_reward(uuid,text,numeric) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_code text := upper(nullif(btrim(new.raw_user_meta_data ->> 'referral_code'), '')); referrer_uuid uuid; reward_amount integer;
begin
  insert into public.profiles (id,email,username,game,player_role,referral_code)
  values (new.id,new.email,coalesce(nullif(new.raw_user_meta_data->>'username',''),split_part(new.email,'@',1)),coalesce(nullif(new.raw_user_meta_data->>'game',''),'Valorant'),coalesce(nullif(new.raw_user_meta_data->>'player_role',''),'Düellocu'),upper(substr(md5(new.id::text),1,12)))
  on conflict (id) do update set email=excluded.email,username=excluded.username,game=excluded.game,player_role=excluded.player_role;
  if requested_code is not null then
    select id, greatest(0,round(case when referral_reward_type='percent' then 100*referral_reward_value/100 else referral_reward_value end))::integer
      into referrer_uuid,reward_amount from public.profiles where upper(referral_code)=requested_code and id<>new.id limit 1;
    if referrer_uuid is not null then
      insert into public.referrals(referrer_id,referred_user_id,reward_bp) values(referrer_uuid,new.id,reward_amount) on conflict(referred_user_id) do nothing;
      if found then
        update public.profiles set balance=balance+reward_amount,updated_at=now() where id=referrer_uuid;
        update public.profiles set referred_by=referrer_uuid where id=new.id;
        insert into public.notifications(recipient_id,message,notification_type,is_read) values(referrer_uuid,'Referans bağlantınla yeni bir oyuncu kayıt oldu. '||reward_amount||' BP hesabına eklendi.','referral_reward',false);
      end if;
    end if;
  end if;
  return new;
end; $$;

drop function if exists public.get_my_referral_summary();
create function public.get_my_referral_summary()
returns table(referral_code text,total_referrals bigint,rewarded_referrals bigint,earned_bp bigint,reward_type text,reward_value numeric)
language sql stable security definer set search_path='' as $$
select p.referral_code,count(r.id),count(r.id) filter(where r.status='rewarded'),coalesce(sum(r.reward_bp) filter(where r.status='rewarded'),0)::bigint,p.referral_reward_type,p.referral_reward_value
from public.profiles p left join public.referrals r on r.referrer_id=p.id where p.id=(select auth.uid()) group by p.referral_code,p.referral_reward_type,p.referral_reward_value; $$;
revoke all on function public.get_my_referral_summary() from public;
grant execute on function public.get_my_referral_summary() to authenticated;
