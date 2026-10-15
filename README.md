# Domain Desk

One Next.js application serves a separate page for each configured domain. The request hostname selects the page; the app does not redirect visitors to a single primary domain. The admin console manages the public page, price, included-domain rules, favicon and private registrar/DNS records.

## Local preview

```powershell
cd domain-platform
npm install
npm run dev
```

Open `http://localhost:3011`. The shared sale-page template defaults to `imet.si`; preview another hostname with `/?domain=namecheck.me` or `/?domain=widen.ai`. Admin: `http://localhost:3011/admin`.

Without Supabase credentials, `/admin` saves the inventory on this server in `data/portfolio.json`. Add, remove, price, daily rise, and bundle changes update the public pages. Each domain keeps its own rise timer, viewer count, registrar, registration date, and expiry. imet.si keeps its original timer. A new domain starts from the price you enter. With Supabase credentials, `/admin` uses the database instead. Run `supabase/migrations/003_price_rise.sql` and `004_domain_clock.sql` after the earlier migrations.

## Connect the backend

1. Create a Supabase project.
2. Run `supabase/migrations/001_domain_platform.sql`, then `supabase/migrations/002_site_template.sql` in the Supabase SQL editor.
3. Run `supabase/seed.sql` to import the current domain portfolio. Starter prices remain on request and registrar details remain empty until you enter them.
4. Create your first user from Supabase Authentication, then add the user UUID to the `public.domain_admins` table. Signup is intentionally not exposed to the public.
5. Copy `.env.example` to `.env.local`, add the project URL and anon key, then restart the app.
6. Sign in at `/admin`. Authenticated admin changes write to Supabase; public pages read active listing fields and the shared website template. Registrar accounts, dates, DNS provider, nameservers and internal notes remain in the private operations table.

Never use a Supabase service-role key in the browser or commit real credentials.

## Vercel and custom domains

Import `domain-platform` as one Next.js project. Add each owned custom domain to the same Vercel project and configure the DNS records Vercel provides at that domain’s registrar. Deploy the Supabase URL and anon key as Vercel environment variables. Vercel routes each incoming hostname to the same deployment; the app renders that hostname’s own page and canonical URL. It does not automatically configure DNS or purchase domains.

The Hobby plan currently lists a 50-custom-domain-per-project limit in Vercel documentation. This portfolio is close to that count; each extra alias can use another slot. Check current limits and plan before attaching the whole inventory.

## Included features

- Email/password Supabase Auth, server-side admin checks and an explicit allowlist.
- Row-level security for active public listings and private operations data.
- One shared, responsive sale-page template on every configured hostname, with shared copy managed in the admin and domain-specific names, prices, included domains, and descriptions.
- Domain CRUD with fixed prices, percentage values, on-request pricing, currency, text or domain bundles, draft/sold/active states and per-domain page copy.
- Additional published or draft pages under each hostname, such as `islam.xyz/about`, with no cross-domain redirects.
- Registrar, account label, registration and renewal dates, DNS provider and nameserver inventory.
- Authenticated favicon uploads to a public, restricted MIME/size Supabase Storage bucket.
- Hostname-based pages, per-domain metadata/canonical URL, portfolio search and responsive layouts.
- Local no-credential demo mode so the UI can be reviewed before connecting Supabase.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```
