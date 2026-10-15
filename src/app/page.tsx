import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { starterDomains, type DomainRecord } from "@/lib/domains";
import { ApprovedDomainTemplate } from "./approved-domain-template";
import { getDomain, getSiteSettings } from "@/lib/public-data";
import { normalizeHostname } from "@/lib/domains";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ domain?: string }> };

async function requestDomain(searchParams: Props["searchParams"]) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const localHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawHost);
  const host = localHost ? normalizeHostname(params.domain || "imet.si") : normalizeHostname(rawHost);
  const [domain, settings] = await Promise.all([getDomain(host), getSiteSettings()]);
  return { domain, settings, localHost, host };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { domain, host } = await requestDomain(searchParams);
  if (!domain) return { title: host };
  return {
    title: domain.title || domain.hostname,
    description: domain.description,
    alternates: { canonical: `https://${host}` },
    icons: domain.faviconUrl ? { icon: [{ url: domain.faviconUrl }, { url: "/favicon.svg", type: "image/svg+xml" }], apple: [{ url: "/apple-touch-icon.png" }] } : undefined,
    openGraph: { title: domain.title || domain.hostname, description: domain.description, url: `https://${host}`, type: "website" },
  };
}

export default async function Home({ searchParams }: Props) {
  const { domain, settings, localHost, host } = await requestDomain(searchParams);
  const previewDomain: DomainRecord | undefined = localHost && !domain
    ? { ...starterDomains[0], id: `preview-${host}`, hostname: host, title: host, includedMode: "none", includedDomains: [] }
    : undefined;
  const resolvedDomain = domain ?? previewDomain;
  if (!resolvedDomain) notFound();
  return <ApprovedDomainTemplate initialDomain={resolvedDomain} settings={settings} />;
}
