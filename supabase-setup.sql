create extension if not exists pgcrypto;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 70),
  price numeric(12, 2) check (price > 0),
  category text not null check (category in ('Home', 'Clothing', 'Electronics', 'Garden', 'Vehicles', 'Other')),
  description text not null check (char_length(description) between 1 and 240),
  seller text not null check (char_length(seller) between 1 and 60),
  email text not null,
  phone text not null,
  address text not null check (char_length(address) between 1 and 120),
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.listings add column if not exists payment_request_id uuid;
alter table public.listings alter column payment_request_id drop not null;
alter table public.listings alter column price drop not null;
create unique index if not exists listings_payment_request_id_key on public.listings(payment_request_id) where payment_request_id is not null;
alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('Home', 'Clothing', 'Electronics', 'Garden', 'Vehicles', 'Other')) not valid;

alter table public.listings enable row level security;

drop policy if exists "Anyone can view listings" on public.listings;
create policy "Anyone can view listings"
  on public.listings for select
  to anon, authenticated
  using (category <> 'Food');

drop policy if exists "Sellers can publish their own listings" on public.listings;
create policy "Sellers can publish their own listings"
  on public.listings for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
  );

grant select on public.listings to anon, authenticated;
grant insert on public.listings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Sellers can upload their own product photos" on storage.objects;
create policy "Sellers can upload their own product photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Sellers can remove their own product photos" on storage.objects;
create policy "Sellers can remove their own product photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
