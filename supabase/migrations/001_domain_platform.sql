create extension if not exists pgcrypto;

create table if not exists public.domain_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_domain_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.domain_admins where user_id = (select auth.uid()));
$$;

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique check (hostname = lower(hostname) and left(hostname, 4) <> 'www.'),
  title text not null,
  category text not null default 'Brandable',
  description text not null default '',
  status text not null default 'active' check (status in ('active','draft','sold')),
  price numeric(14,2) check (price is null or price >= 0),
  price_type text not null default 'request' check (price_type in ('fixed','percentage','request')),
  currency char(3) not null default 'EUR',
  included_mode text not null default 'none' check (included_mode in ('domains','text','none')),
  included_domains text[] not null default '{}',
  included_text text not null default '',
  favicon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domain_operations (
  hostname text primary key references public.domains(hostname) on update cascade on delete cascade,
  registrar text,
  registrar_account text,
  registered_on date,
  renews_on date,
  dns_provider text,
  nameservers text,
  dns_status text not null default 'unknown' check (dns_status in ('unknown','pending','active','attention')),
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.domain_pages (
  id uuid primary key default gen_random_uuid(),
  hostname text not null references public.domains(hostname) on update cascade on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  content text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hostname, slug)
);

alter table public.domains enable row level security;
alter table public.domain_operations enable row level security;
alter table public.domain_admins enable row level security;
alter table public.domain_pages enable row level security;

drop policy if exists "Public can view active domain pages" on public.domains;
create policy "Public can view active domain pages" on public.domains for select to anon, authenticated using (status = 'active' or (select public.is_domain_admin()));
drop policy if exists "Admins manage domains" on public.domains;
create policy "Admins manage domains" on public.domains for all to authenticated using ((select public.is_domain_admin())) with check ((select public.is_domain_admin()));
drop policy if exists "Admins manage operations" on public.domain_operations;
create policy "Admins manage operations" on public.domain_operations for all to authenticated using ((select public.is_domain_admin())) with check ((select public.is_domain_admin()));
drop policy if exists "Admins read admin roster" on public.domain_admins;
create policy "Admins read admin roster" on public.domain_admins for select to authenticated using ((select public.is_domain_admin()));
drop policy if exists "Public can view published pages" on public.domain_pages;
create policy "Public can view published pages" on public.domain_pages for select to anon, authenticated using (published and exists (select 1 from public.domains where domains.hostname = domain_pages.hostname and domains.status = 'active') or (select public.is_domain_admin()));
drop policy if exists "Admins manage site pages" on public.domain_pages;
create policy "Admins manage site pages" on public.domain_pages for all to authenticated using ((select public.is_domain_admin())) with check ((select public.is_domain_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('domain-favicons', 'domain-favicons', true, 1048576, array['image/png','image/jpeg','image/webp','image/svg+xml','image/x-icon','image/vnd.microsoft.icon'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Public favicon reads" on storage.objects;
create policy "Public favicon reads" on storage.objects for select using (bucket_id = 'domain-favicons');
drop policy if exists "Admins manage favicons" on storage.objects;
create policy "Admins manage favicons" on storage.objects for all to authenticated using (bucket_id = 'domain-favicons' and (select public.is_domain_admin())) with check (bucket_id = 'domain-favicons' and (select public.is_domain_admin()));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists domains_touch_updated_at on public.domains;
create trigger domains_touch_updated_at before update on public.domains for each row execute function public.touch_updated_at();
drop trigger if exists operations_touch_updated_at on public.domain_operations;
create trigger operations_touch_updated_at before update on public.domain_operations for each row execute function public.touch_updated_at();
drop trigger if exists domain_pages_touch_updated_at on public.domain_pages;
create trigger domain_pages_touch_updated_at before update on public.domain_pages for each row execute function public.touch_updated_at();
