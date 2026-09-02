create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  shirt_number int not null,
  first_name text not null,
  last_name text not null,
  position text,
  profile_image text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  date date,
  kickoff_time time,
  stadium text,
  competition text default '9. divisionen',
  status text not null default 'Kommende',
  home_score int,
  away_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  minute int not null,
  event_type text not null,
  player_id uuid references players(id),
  assist_player_id uuid references players(id),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists standings (
  id uuid primary key default gen_random_uuid(), position int not null, team_name text not null,
  played int default 0, won int default 0, drawn int default 0, lost int default 0,
  goals_for int default 0, goals_against int default 0,
  goal_difference int generated always as (goals_for-goals_against) stored,
  points int default 0
);

create sequence if not exists fcg_order_seq start 1;
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('FCG-' || lpad(nextval('fcg_order_seq')::text,4,'0')),
  first_name text not null,last_name text not null,email text not null,phone text not null,
  size text not null check (size in ('XS','S','M','L','XL','XXL')),
  shirt_name text,shirt_number int check (shirt_number between 0 and 99),comment text,
  price int not null default 599,payment_status text not null default 'Afventer betaling',
  order_status text not null default 'Afventer betaling',seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),title text not null,body text not null,type text default 'Information',
  active boolean not null default true,start_at timestamptz,end_at timestamptz,created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),admin_id uuid references auth.users(id),action text not null,created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_events enable row level security;
alter table standings enable row level security;
alter table orders enable row level security;
alter table announcements enable row level security;
alter table audit_logs enable row level security;

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select is_admin from profiles where id=auth.uid()),false)
$$;

create policy "public players read" on players for select using (true);
create policy "public matches read" on matches for select using (true);
create policy "public events read" on match_events for select using (true);
create policy "public standings read" on standings for select using (true);
create policy "public announcements read" on announcements for select using (true);
create policy "orders insert public" on orders for insert with check (true);
create policy "admins profiles read" on profiles for select using (is_admin() or id=auth.uid());
create policy "admins players write" on players for all using (is_admin()) with check (is_admin());
create policy "admins matches write" on matches for all using (is_admin()) with check (is_admin());
create policy "admins events write" on match_events for all using (is_admin()) with check (is_admin());
create policy "admins standings write" on standings for all using (is_admin()) with check (is_admin());
create policy "admins orders read" on orders for select using (is_admin());
create policy "admins orders update" on orders for update using (is_admin()) with check (is_admin());
create policy "admins announcements write" on announcements for all using (is_admin()) with check (is_admin());
create policy "admins audit" on audit_logs for all using (is_admin()) with check (is_admin());

insert into players (shirt_number,first_name,last_name) values
(1,'Mikkel','Ovesen'),(3,'Marcus','Trolle'),(4,'Luca','James'),(5,'William','Gudmann'),(7,'David','Østergaard'),(8,'Anders','Koch'),(9,'Villads','Rifbjerg'),(10,'Andreas','Bryde'),(11,'Miguel','Llanza'),(21,'Villads','Bischoff'),(69,'William','Grønholt')
on conflict do nothing;

insert into matches (home_team,away_team,status) values
('Taastrup IF','FC Glostruplona','Kommende'),('FC Glostruplona','Hundige BK','Kommende'),('FC Glostruplona','FC Ishøj','Kommende');
