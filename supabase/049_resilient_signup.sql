-- Yeni hesap kaydı, referans bildirimi/ödülü gibi ikincil işlemlerden dolayı
-- başarısız olmamalıdır. Profil kaydı zorunlu; referans işlemi best-effort'tür.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_code text := upper(nullif(btrim(new.raw_user_meta_data ->> 'referral_code'), ''));
  referrer_uuid uuid;
  reward_amount integer;
begin
  insert into public.profiles (id,email,username,game,player_role,referral_code)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'),''),split_part(new.email,'@',1)),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'game'),''),'Valorant'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'player_role'),''),'Düellocu'),
    upper(substr(md5(new.id::text),1,12))
  )
  on conflict (id) do update set
    email=excluded.email,
    username=excluded.username,
    game=excluded.game,
    player_role=excluded.player_role;

  if requested_code is not null then
    begin
      select id,
        greatest(0,round(case when referral_reward_type='percent' then referral_reward_value else referral_reward_value end))::integer
      into referrer_uuid,reward_amount
      from public.profiles
      where upper(referral_code)=requested_code and id<>new.id
      limit 1;

      if referrer_uuid is not null then
        insert into public.referrals(referrer_id,referred_user_id,reward_bp)
        values(referrer_uuid,new.id,reward_amount)
        on conflict(referred_user_id) do nothing;
        if found then
          update public.profiles set balance=balance+reward_amount,updated_at=now() where id=referrer_uuid;
          update public.profiles set referred_by=referrer_uuid where id=new.id;
          insert into public.notifications(recipient_id,message,notification_type,is_read)
          values(referrer_uuid,'Referans bağlantınla yeni bir oyuncu kayıt oldu. '||reward_amount||' BP hesabına eklendi.','referral_reward',false);
        end if;
      end if;
    exception when others then
      raise warning 'Referans işlemi tamamlanamadı (kullanıcı kaydı devam etti): %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;
