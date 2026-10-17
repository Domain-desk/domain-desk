import Link from "next/link";
import { ArrowLeft, ArrowUpRight, KeyRound, ShieldCheck } from "lucide-react";
import { hasRiseStart, imetRiseStartedAt, normalizePriceRisePercent, normalizeViewerCount, starterDomains, type DomainPageRecord, type DomainRecord } from "@/lib/domains";
import { readPortfolio } from "@/lib/portfolio-store";
import { defaultSiteSettings, siteSettingsFromRow, type SiteSettings } from "@/lib/site-settings";
import { liveHostnames } from "@/lib/site-reachability";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";

function emptyThemeResults(): ThemeResults {
  return { lightViews: 0, darkViews: 0, lightInquiries: 0, darkInquiries: 0 };
}

function themeResultsFromRows(rows: Array<{ theme: string; event: string }> | null): ThemeResults {
  const results = emptyThemeResults();
  for (const row of rows ?? []) {
    if (row.theme === "light" && row.event === "view") results.lightViews += 1;
    if (row.theme === "dark" && row.event === "view") results.darkViews += 1;
    if (row.theme === "light" && row.event === "inquiry") results.lightInquiries += 1;
    if (row.theme === "dark" && row.event === "inquiry") results.darkInquiries += 1;
  }
  return results;
}
import { AdminConsole, type ThemeResults } from "./admin-console";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const adminSections = ["Overview", "Domains", "Operations", "Site pages", "Website template", "Settings"];

type AdminPageProps = { searchParams: Promise<{ demo?: string; error?: string; section?: string; edit?: string }> };

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  if (!hasSupabaseConfig) {
    const portfolio = await readPortfolio();
    const liveHosts = await liveHostnames(portfolio.domains.map((domain) => domain.hostname));
    return <AdminConsole initialDomains={portfolio.domains} initialPages={portfolio.pages} initialSettings={portfolio.settings} demoMode={false} backend="server" email="Administrator" liveHosts={liveHosts} themeResults={emptyThemeResults()} initialSection={adminSections.includes(params.section ?? "") ? params.section : undefined} initialEdit={params.edit}/>;
  }
  if (params.demo === "1") return <AdminConsole initialDomains={starterDomains} initialPages={[]} initialSettings={defaultSiteSettings} demoMode backend="server" initialSection={adminSections.includes(params.section ?? "") ? params.section : undefined} initialEdit={params.edit}/>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <LoginScreen configured error={params.error}/>;
  const { data: isAdmin } = await supabase.from("domain_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!isAdmin) return <LoginScreen configured error="not-admin"/>;
  const [{ data: rows }, { data: operations }, { data: pageRows }, { data: settingsRow }, { data: themeRows }] = await Promise.all([
    supabase.from("domains").select("*").order("hostname"),
    supabase.from("domain_operations").select("*").order("hostname"),
    supabase.from("domain_pages").select("*").order("hostname").order("slug"),
    supabase.from("site_settings").select("*").eq("id", "global").maybeSingle(),
    supabase.from("theme_events").select("theme,event").limit(5000),
  ]);
  const opByHostname = new Map((operations ?? []).map((operation) => [operation.hostname, operation]));
  const databaseDomains: DomainRecord[] = (rows ?? []).map((row) => {
    const ops = opByHostname.get(row.hostname);
    return {
      id: row.id, hostname: row.hostname, title: row.title, category: row.category, description: row.description, status: row.status,
      price: row.price === null ? null : Number(row.price), priceType: row.price_type, priceRisePercent: normalizePriceRisePercent(row.price_rise_percent),
      priceRiseStartedAt: hasRiseStart(row.price_rise_started_at) ? new Date(Date.parse(String(row.price_rise_started_at))).toISOString() : row.hostname === "imet.si" ? imetRiseStartedAt : "",
      viewerCount: normalizeViewerCount(row.viewer_count, row.hostname), currency: row.currency,
      includedMode: row.included_mode, includedDomains: row.included_domains ?? [], includedText: row.included_text ?? "",
      faviconUrl: row.favicon_url ?? "", registrar: ops?.registrar ?? "", registrarAccount: ops?.registrar_account ?? "",
      registeredOn: ops?.registered_on ?? "", renewsOn: ops?.renews_on ?? "", dnsProvider: ops?.dns_provider ?? "",
      nameservers: ops?.nameservers ?? "", dnsStatus: ops?.dns_status ?? "unknown", internalNotes: ops?.internal_notes ?? "",
    };
  });
  const pages: DomainPageRecord[] = (pageRows ?? []).map((row) => ({ id: row.id, hostname: row.hostname, slug: row.slug, title: row.title, content: row.content, published: row.published }));
  const settings: SiteSettings = settingsRow ? siteSettingsFromRow(settingsRow) : defaultSiteSettings;
  const liveHosts = await liveHostnames(databaseDomains.map((domain) => domain.hostname));
  return <AdminConsole initialDomains={databaseDomains} initialPages={pages} initialSettings={settings} demoMode={false} email={user.email} liveHosts={liveHosts} themeResults={themeResultsFromRows(themeRows)} initialSection={adminSections.includes(params.section ?? "") ? params.section : undefined} initialEdit={params.edit}/>;
}

function LoginScreen({ configured, error }: { configured: boolean; error?: string }) {
  const err = error === "login" ? "That email or password did not match." : error === "invalid" ? "Enter a valid email and password." : error === "not-admin" ? "This account is not on the administrator allowlist." : "";
  return <main className="login-page"><div className="login-card"><Link className="back-link" href="/"><ArrowLeft size={15}/> Back to portfolio</Link><div className="login-icon"><KeyRound size={22}/></div><span className="eyebrow-label">DOMAIN DESK</span><h1>Welcome back.</h1><p>Sign in to manage your domain portfolio.</p>{configured ? <form action={signIn} className="login-form"><label className="field"><span>Email</span><input name="email" type="email" autoComplete="username" placeholder="you@example.com" required/></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required minLength={8}/></label>{err && <div className="notice form-notice" role="alert">{err}</div>}<Button className="primary-button login-submit" type="submit">Sign in <ArrowUpRight size={15}/></Button></form> : <div className="setup-required"><ShieldCheck size={18}/><span><strong>Secure sign-in is ready to connect</strong><small>Add your Supabase URL and public key, run the included database setup, then add your admin account.</small></span></div>}<div className="login-divider"><span>LOCAL PREVIEW</span></div><Link className="preview-link" href="/admin?demo=1">Open admin preview <ArrowUpRight size={15}/></Link><Link className="setup-link" href="/setup">View backend setup instructions</Link></div></main>;
}
