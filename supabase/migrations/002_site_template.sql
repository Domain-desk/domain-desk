create table if not exists public.site_settings (
  id text primary key check (id = 'global'),
  availability_label text not null default 'AVAILABLE DOMAIN',
  price_on_request_label text not null default 'PRICING',
  asking_price_label text not null default 'ASKING PRICE',
  included_label text not null default 'domain included',
  transfer_label text not null default 'Transfer',
  transfer_value text not null default 'Via Escrow.com',
  payment_label text not null default 'Payment',
  payment_value text not null default 'Held by Escrow',
  ownership_label text not null default 'Ownership',
  ownership_value text not null default 'To your registrar',
  button_label text not null default 'MAKE AN INQUIRY',
  contact_label text not null default 'CONTACT US',
  contact_email text not null default 'spa.jeton@gmail.com',
  portfolio_label text not null default 'VIEW OUR FULL PORTFOLIO',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values ('global') on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Public can view website template" on public.site_settings;
create policy "Public can view website template" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage website template" on public.site_settings;
create policy "Admins manage website template" on public.site_settings for all to authenticated using ((select public.is_domain_admin())) with check ((select public.is_domain_admin()));

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at before update on public.site_settings for each row execute function public.touch_updated_at();
