create extension if not exists pgcrypto;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_date date not null,
  start_time time not null,
  end_time time not null,
  resource text not null,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  phone text not null check (char_length(phone) between 7 and 20),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','completed','no_show')),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id)
);

create table if not exists public.staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;
alter table public.staff_users enable row level security;

revoke all on table public.reservations from anon;
revoke all on table public.staff_users from anon;
grant select, update, delete on public.reservations to authenticated;
grant select on public.staff_users to authenticated;

drop policy if exists "staff can read reservations" on public.reservations;
create policy "staff can read reservations" on public.reservations for select to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));

drop policy if exists "staff can update reservations" on public.reservations;
create policy "staff can update reservations" on public.reservations for update to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid()))
with check (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));

drop policy if exists "staff can delete reservations" on public.reservations;
create policy "staff can delete reservations" on public.reservations for delete to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));

drop policy if exists "staff can read staff_users" on public.staff_users;
create policy "staff can read staff_users" on public.staff_users for select to authenticated
using (exists(select 1 from public.staff_users s where s.user_id=auth.uid()));

create or replace function public.get_booked_slots(p_date date,p_resource text)
returns table(start_time time,end_time time)
language sql security definer set search_path=public
as $$
  select r.start_time,r.end_time
  from public.reservations r
  where r.reservation_date=p_date and r.resource=p_resource and r.status='confirmed'
  order by r.start_time;
$$;
revoke all on function public.get_booked_slots(date,text) from public;
grant execute on function public.get_booked_slots(date,text) to anon,authenticated;

create or replace function public.create_reservation(
  p_resource text,
  p_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_customer_name text,
  p_phone text,
  p_notes text default null
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  new_id uuid;
  v_end_time time;
begin
  if p_date < current_date then raise exception 'past_date'; end if;
  if p_duration_minutes not in (60,90,120) then raise exception 'invalid_duration'; end if;
  if trim(coalesce(p_customer_name,''))='' then raise exception 'name_required'; end if;
  if trim(coalesce(p_phone,''))='' then raise exception 'phone_required'; end if;
  if p_resource not in ('phoenix2','lx') then raise exception 'invalid_resource'; end if;

  -- Zona Toy: 10:00 AM a 8:30 PM.
  v_end_time := p_start_time + make_interval(mins=>p_duration_minutes);
  if p_start_time < time '10:00' or v_end_time > time '20:30' then
    raise exception 'outside_business_hours';
  end if;

  -- Bloquea TODA la máquina. No permite reservas traslapadas.
  -- Ejemplo: si hay 5:00–7:00, nadie puede reservar 4:30–5:30,
  -- 5:30–6:30 ni 6:30–7:30 en esa misma máquina.
  if exists(
    select 1 from public.reservations r
    where r.reservation_date=p_date
      and r.resource=p_resource
      and r.status='confirmed'
      and p_start_time < r.end_time
      and v_end_time > r.start_time
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.reservations(
    reservation_date,start_time,end_time,resource,customer_name,phone,notes,status
  ) values(
    p_date,p_start_time,v_end_time,p_resource,trim(p_customer_name),trim(p_phone),
    nullif(trim(coalesce(p_notes,'')),''),
    'confirmed'
  ) returning id into new_id;

  return new_id;
end;
$$;
revoke all on function public.create_reservation(text,date,time,integer,text,text,text) from public;
grant execute on function public.create_reservation(text,date,time,integer,text,text,text) to anon,authenticated;

-- Para cada empleado:
-- 1) Supabase > Authentication > Users > Add user
-- 2) copia su UUID y ejecuta:
-- insert into public.staff_users(user_id,display_name)
-- values ('UUID_DEL_USUARIO','Nombre del empleado');
