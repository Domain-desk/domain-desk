import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { normalizeHostname } from "@/lib/domains";
import { getDomain, getSitePage } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string[] }>; searchParams: Promise<{ domain?: string }> };

async function resolvePage({ params, searchParams }: Props) {
  const [{ slug: parts }, query, requestHeaders] = await Promise.all([params, searchParams, headers()]);
  if (parts.length !== 1) return undefined;
  const rawHost = requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host") ?? "localhost";
  const localPreview = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rawHost);
  const hostname = localPreview ? normalizeHostname(query.domain || "imet.si") : normalizeHostname(rawHost);
  const [domain, page] = await Promise.all([getDomain(hostname), getSitePage(hostname, parts[0])]);
  return domain && page ? { domain, page, hostname, localPreview } : undefined;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const result = await resolvePage(props);
  if (!result) return { title: "Page not found" };
  return {
    title: `${result.page.title} · ${result.hostname}`,
    description: result.page.content.slice(0, 160),
    alternates: { canonical: `https://${result.hostname}/${result.page.slug}` },
    icons: result.domain.faviconUrl ? { icon: [{ url: result.domain.faviconUrl }], apple: [{ url: "/apple-touch-icon.png" }] } : undefined,
  };
}

export default async function SitePage(props: Props) {
  const result = await resolvePage(props);
  if (!result) notFound();
  const homeHref = result.localPreview ? `/?domain=${encodeURIComponent(result.hostname)}` : "/";
  return <main className="public-shell"><header className="public-header"><Link href={homeHref} className="public-brand"><span className="public-brand-mark">D</span>{result.hostname.toUpperCase()}</Link><nav><Link href={homeHref}>Home</Link><Link href="/portfolio">All domains</Link></nav></header><article className="public-subpage"><span className="domain-eyebrow">{result.hostname.toUpperCase()}</span><h1>{result.page.title}</h1><article>{result.page.content}</article><Link className="subpage-back" href={homeHref}><ArrowLeft size={14}/> Back to {result.hostname}</Link></article><footer className="public-footer"><span>{result.hostname}</span><Link href={homeHref}>Home <ArrowUpRight size={13}/></Link></footer></main>;
}
