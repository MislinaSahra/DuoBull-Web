alter table public.profiles add column if not exists username_changed_at timestamptz;
create or replace function public.enforce_username_change_rules()
returns trigger language plpgsql set search_path = public as $$
begin
  if lower(trim(new.username)) is distinct from lower(trim(old.username)) then
    if length(trim(new.username)) < 3 or length(trim(new.username)) > 24 then raise exception 'Kullanıcı adı 3-24 karakter arasında olmalı.'; end if;
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then raise exception 'Kullanıcı adı 30 günde yalnızca bir kez değiştirilebilir.'; end if;
    new.username := trim(new.username); new.username_changed_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists enforce_username_change_rules_trigger on public.profiles;
create trigger enforce_username_change_rules_trigger before update of username on public.profiles
for each row execute procedure public.enforce_username_change_rules();
