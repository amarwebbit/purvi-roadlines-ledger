create extension if not exists "pgcrypto";

create table if not exists transport_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  address text,
  created_at timestamptz default now()
);

create table if not exists truck_owners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_at timestamptz default now()
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_date date not null default current_date,
  transport_company_id uuid references transport_companies(id) on delete set null,
  from_location text,
  to_location text,
  truck_owner_id uuid references truck_owners(id) on delete set null,
  truck_number text,
  driver_name text,
  driver_mobile text,
  rate numeric(12,2) not null default 0,
  advance_to_owner numeric(12,2) not null default 0,
  balance_to_owner numeric(12,2) not null default 0,
  owner_payment_status text not null default 'pending' check (owner_payment_status in ('pending','partial','completed')),
  advance_from_company numeric(12,2) not null default 0,
  balance_from_company numeric(12,2) not null default 0,
  company_payment_status text not null default 'pending' check (company_payment_status in ('pending','partial','completed')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists deliveries_company_idx on deliveries(transport_company_id);
create index if not exists deliveries_owner_idx on deliveries(truck_owner_id);
create index if not exists deliveries_date_idx on deliveries(delivery_date);
