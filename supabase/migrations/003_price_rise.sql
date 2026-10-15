alter table public.domains
  add column if not exists price_rise_percent numeric(6,2) not null default 7
  check (price_rise_percent >= 0 and price_rise_percent <= 100);
