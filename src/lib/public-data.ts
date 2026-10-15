import { cache } from "react";
import { hasRiseStart, imetRiseStartedAt, normalizeHostname, normalizePriceRisePercent, normalizeViewerCount, type DomainRecord } from "@/lib/domains";
import { readPortfolio } from "@/lib/portfolio-store";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";
import { defaultSiteSettings, siteSettingsFromRow, type SiteSettings } from "@/lib/site-settings";

function domainFromRow(row: Record<string, unknown>): DomainRecord {
  return {
    id: String(row.id), hostname: String(row.hostname), title: String(row.title), category: String(row.category), status: row.status as DomainRecord["status"],
    description: String(row.description ?? ""), price: row.price === null || row.price === undefined ? null : Number(row.price), priceType: row.price_type as DomainRecord["priceType"],
    priceRisePercent: normalizePriceRisePercent(row.price_rise_percent),
    priceRiseStartedAt: hasRiseStart(row.price_rise_started_at) ? new Date(Date.parse(String(row.price_rise_started_at))).toISOString() : row.hostname === "imet.si" ? imetRiseStartedAt : "",
    viewerCount: normalizeViewerCount(row.viewer_count, String(row.hostname ?? "")),
    currency: String(row.currency ?? "EUR"), includedMode: row.included_mode as DomainRecord["includedMode"],
    includedDomains: Array.isArray(row.included_domains) ? row.included_domains.map(String) : [], includedText: String(row.included_text ?? ""),
    faviconUrl: String(row.favicon_url ?? ""), registrar: "", registrarAccount: "", registeredOn: "", renewsOn: "", dnsProvider: "", nameservers: "", dnsStatus: "unknown", internalNotes: "",
  };
}

export const getPublicDomains = cache(async (): Promise<DomainRecord[]> => {
  if (!hasSupabaseConfig) return (await readPortfolio()).domains.filter((domain) => domain.status === "active");
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("domains").select("*").eq("status", "active").order("hostname");
    if (error || !data) return (await readPortfolio()).domains.filter((domain) => domain.status === "active");
    return data.map((row) => domainFromRow(row));
  } catch {
    return (await readPortfolio()).domains.filter((domain) => domain.status === "active");
  }
});

export const getDomain = cache(async (host: string) => {
  const normalized = normalizeHostname(host);
  return (await getPublicDomains()).find((domain) => domain.hostname === normalized);
});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  if (!hasSupabaseConfig) return (await readPortfolio()).settings;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", "global").maybeSingle();
    return error || !data ? defaultSiteSettings : siteSettingsFromRow(data);
  } catch {
    return (await readPortfolio()).settings;
  }
});

export const getSitePage = cache(async (host: string, slug: string) => {
  const hostname = normalizeHostname(host);
  if (!hasSupabaseConfig) {
    return (await readPortfolio()).pages.find((page) => page.hostname === hostname && page.slug === slug && page.published);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("domain_pages").select("hostname,slug,title,content").eq("hostname", hostname).eq("slug", slug).eq("published", true).maybeSingle();
    return error || !data ? undefined : data;
  } catch {
    return (await readPortfolio()).pages.find((page) => page.hostname === hostname && page.slug === slug && page.published);
  }
});
