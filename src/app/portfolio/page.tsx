import Link from "next/link";
import { headers } from "next/headers";
import { getPublicDomains } from "@/lib/public-data";
import { PortfolioBrowser } from "./portfolio-browser";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [domains, requestHeaders] = await Promise.all([getPublicDomains(), headers()]);
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const localPreview = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return <main className="portfolio-page"><header className="public-header"><Link href="/" className="public-brand"><span className="public-brand-mark">D</span> DOMAIN PORTFOLIO</Link><nav><Link href="/">Featured page</Link><Link href="/admin">Admin</Link></nav></header><section className="portfolio-intro"><span className="domain-eyebrow">A CONSIDERED COLLECTION</span><h1>Names for what’s next.</h1><p>Premium domain names selected for ambitious ideas. Clear pricing, secure transfer, and a direct path to ownership.</p></section><PortfolioBrowser domains={domains} localPreview={localPreview}/><footer className="public-footer"><span>{domains.length} available domains</span><span>Every domain stays on its own name.</span></footer></main>;
}
