begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default 'My business' check (char_length(business_name) between 1 and 80),
  is_demo boolean not null default false
);

create table public.entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  customer text,
  description text not null check (char_length(btrim(description)) between 1 and 120),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  check ((kind = 'income' and customer is not null and char_length(btrim(customer)) between 1 and 80) or (kind = 'expense' and customer is null))
);
create index entries_owner_month on public.entries(user_id, occurred_at desc) where voided_at is null;

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy read_own_entries on public.entries for select to authenticated using (user_id = (select auth.uid()));
create policy insert_own_entries on public.entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy void_own_entries on public.entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.profiles, public.entries from anon, authenticated;
grant select on public.profiles, public.entries to authenticated;
grant insert(id, kind, customer, description, amount_cents) on public.entries to authenticated;
grant update(voided_at) on public.entries to authenticated;
grant all on public.profiles, public.entries to service_role;

create function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id) values (new.id);
  return new;
end;
$$;
revoke all on function public.create_profile() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile();

create function public.monthly_snapshot() returns jsonb language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select date_trunc('month', now() at time zone 'Australia/Sydney') as local_start
  ), current_entries as (
    select e.* from public.entries e, bounds b
    where e.user_id = (select auth.uid()) and e.voided_at is null
      and e.occurred_at >= b.local_start at time zone 'Australia/Sydney'
      and e.occurred_at < (b.local_start + interval '1 month') at time zone 'Australia/Sydney'
  ), recent as (
    select id, kind, customer, description, amount_cents, occurred_at
    from current_entries order by occurred_at desc, id desc limit 20
  )
  select jsonb_build_object(
    'month_key', to_char(b.local_start, 'YYYY-MM'),
    'month_label', to_char(b.local_start, 'FMMonth YYYY'),
    'in_cents', coalesce((select sum(amount_cents) from current_entries where kind = 'income'), 0),
    'out_cents', coalesce((select sum(amount_cents) from current_entries where kind = 'expense'), 0),
    'entry_count', (select count(*) from current_entries),
    'entries', coalesce((select jsonb_agg(to_jsonb(r) order by r.occurred_at desc, r.id desc) from recent r), '[]'::jsonb)
  ) from bounds b;
$$;
revoke all on function public.monthly_snapshot() from public, anon;
grant execute on function public.monthly_snapshot() to authenticated;
commit;
