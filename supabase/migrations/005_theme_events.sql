create table if not exists public.theme_events (
  id uuid primary key default gen_random_uuid(),
  hostname text not null,
  theme text not null check (theme in ('light', 'dark')),
  event text not null check (event in ('view', 'inquiry')),
  created_at timestamptz not null default now()
);

alter table public.theme_events enable row level security;

drop policy if exists "Visitors record theme results" on public.theme_events;
create policy "Visitors record theme results" on public.theme_events
  for insert to anon, authenticated
  with check (theme in ('light', 'dark') and event in ('view', 'inquiry'));

drop policy if exists "Admins read theme results" on public.theme_events;
create policy "Admins read theme results" on public.theme_events
  for select to authenticated
  using ((select public.is_domain_admin()));
