alter table public.domains add column if not exists price_rise_started_at timestamptz;
alter table public.domains add column if not exists viewer_count integer not null default 0 check (viewer_count >= 0);

update public.domains
set price_rise_started_at = '2026-10-13T22:21:15Z', viewer_count = 3
where hostname = 'imet.si' and price_rise_started_at is null;
