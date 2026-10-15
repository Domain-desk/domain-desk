import Link from "next/link";
import { ArrowLeft, Check, Circle, ExternalLink } from "lucide-react";

const steps = [
  ["Create a Supabase project", "Create a project and keep its URL and anon/publishable key available. Never put a service role key in the browser."],
  ["Run the database setup", "In Supabase SQL Editor, run supabase/migrations/001_domain_platform.sql, then supabase/migrations/002_site_template.sql, and then supabase/seed.sql. This creates domain and subpage records, the shared website template, private registrar inventory, the admin allowlist and favicon bucket, then imports the current starter domains."],
  ["Add credentials locally", "Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Restart the development server."],
  ["Create the first administrator", "In Supabase Authentication, invite or create your user. Then add that user’s UUID to public.domain_admins from the SQL editor. Public signup is not enabled."],
  ["Add every domain to one Vercel project", "Import this folder as one Next.js project. Add each custom domain under the same Vercel project and configure the DNS records at its registrar. Requests are resolved by hostname; they do not all redirect to one domain."],
  ["Add Vercel environment variables", "Set the same Supabase URL and anon key for Production, Preview and Development. Redeploy after changing environment variables."],
];

export default function SetupPage() {
  return <main className="setup-page"><Link className="back-link" href="/admin"><ArrowLeft size={15}/> Back to Domain Desk</Link><span className="eyebrow-label">DEPLOYMENT GUIDE</span><h1>One app. Every domain.</h1><p className="setup-lead">Set up the secure backend once, then connect all your domains to the same Vercel project. Each request remains on its own hostname and shows that domain’s configured page.</p><div className="setup-steps">{steps.map(([title, description], index) => <article className="setup-step" key={title}><span className="step-number">{index + 1}</span><div><h2>{title}</h2><p>{description}</p></div><Circle size={16}/></article>)}</div><div className="setup-callout"><strong>Vercel free plan domain capacity</strong><p>Vercel Hobby documentation currently lists a 50 custom-domain limit per project. Your portfolio is close to that limit, so leave room for `www` aliases and future domains; Pro may be needed as it grows.</p><a href="https://vercel.com/docs/domains/working-with-domains/add-a-domain" target="_blank" rel="noreferrer">Read Vercel’s domain limits <ExternalLink size={14}/></a></div><div className="setup-complete"><Check size={17}/> The project includes deployment steps in <code>README.md</code> and the database migrations.</div></main>;
}
