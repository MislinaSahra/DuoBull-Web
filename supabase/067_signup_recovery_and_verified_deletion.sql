-- A failed client response can leave a valid, unconfirmed auth user and profile.
-- This function reveals only whether an exact email + username pair belongs to
-- such a pending account, allowing the client to resend confirmation safely.
create or replace function public.is_pending_signup(candidate_username text,candidate_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from auth.users u join public.profiles p on p.id=u.id
    where lower(trim(p.username))=lower(trim(candidate_username))
      and lower(trim(u.email))=lower(trim(candidate_email))
      and u.email_confirmed_at is null
  );
$$;
revoke all on function public.is_pending_signup(text,text) from public;
grant execute on function public.is_pending_signup(text,text) to anon,authenticated;

-- Destructive account deletion requires a fresh email OTP session. Merely
-- showing a confirmation button in React is deliberately not sufficient.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path='' as $$
declare issued_at timestamptz; methods jsonb;
begin
  issued_at:=to_timestamp(coalesce((auth.jwt()->>'iat')::bigint,0));
  methods:=coalesce(auth.jwt()->'amr','[]'::jsonb);
  if issued_at < now()-interval '10 minutes' or not jsonb_path_exists(methods,'$[*] ? (@.method == "otp")') then
    raise exception 'EMAIL_VERIFICATION_REQUIRED';
  end if;
  if not exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null) then
    raise exception 'EMAIL_NOT_CONFIRMED';
  end if;
  delete from auth.users where id=(select auth.uid());
end $$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
