"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Globe2 } from "lucide-react";
import { DomainThemeToggle } from "./domain-theme-toggle";
import type { DomainRecord } from "@/lib/domains";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings";

export function DomainSalePage({ initialDomain, initialSettings, localPreview }: { initialDomain: DomainRecord; initialSettings: SiteSettings; localPreview: boolean }) {
  const [domain, setDomain] = useState(initialDomain);
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    if (!localPreview) return;
    const timer = window.setTimeout(() => {
      try {
        const storedDomains = localStorage.getItem("domain-platform-demo");
        if (storedDomains) {
          const domains = JSON.parse(storedDomains) as DomainRecord[];
          const savedDomain = domains.find((item) => item.hostname === initialDomain.hostname);
          if (savedDomain) setDomain(savedDomain);
        }
        const storedSettings = localStorage.getItem("domain-platform-demo-template");
        if (storedSettings) setSettings({ ...defaultSiteSettings, ...JSON.parse(storedSettings) });
      } catch {
        localStorage.removeItem("domain-platform-demo");
        localStorage.removeItem("domain-platform-demo-template");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialDomain, localPreview]);

  const contact = `mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Inquiry about ${domain.hostname}`)}`;
  const included = domain.includedMode === "domains" ? domain.includedDomains.join(", ") : domain.includedMode === "text" ? domain.includedText : "";
  const price = domain.priceType === "request" || domain.price === null
    ? "Price on request"
    : domain.priceType === "percentage"
      ? `${domain.price}%`
      : new Intl.NumberFormat("en", { style: "currency", currency: domain.currency, maximumFractionDigits: 0 }).format(domain.price);

  return <main className="sale-page">
    <div className="sale-background" aria-hidden="true"/>
    <div className="sale-topbar">
      {localPreview && <div className="sale-preview"><span>LOCAL PREVIEW</span><strong>{domain.hostname}</strong><span className="sale-preview-links"><Link href="/?domain=imet.si">imet.si</Link> · <Link href="/?domain=namecheck.me">namecheck.me</Link> · <Link href="/?domain=widen.ai">widen.ai</Link></span><Link href="/admin?demo=1">Admin <ArrowUpRight size={12}/></Link></div>}
      <DomainThemeToggle/>
    </div>
    <section className="sale-main" aria-label={`${domain.hostname} domain listing`}>
      <div className="sale-domain-column">
        <span className="sale-eyebrow"><Globe2 size={13}/>{settings.availabilityLabel}</span>
        <h1>{domain.hostname}</h1>
        {domain.description && <p className="sale-description">{domain.description}</p>}
        {domain.includedMode === "domains" && included && <p className="sale-included">{settings.includedLabel} <strong>{included}</strong></p>}
        {domain.includedMode === "text" && domain.includedText.trim() && <p className="sale-included sale-included-text">{domain.includedText}</p>}
        <div className="sale-facts">
          <div><strong>{settings.transferLabel}</strong><span>{settings.transferValue}</span></div>
          <div><strong>{settings.paymentLabel}</strong><span>{settings.paymentValue}</span></div>
          <div><strong>{settings.ownershipLabel}</strong><span>{settings.ownershipValue}</span></div>
        </div>
      </div>
      <div className="sale-offer-column">
        <span className="sale-price-label">{domain.priceType === "request" || domain.price === null ? settings.priceOnRequestLabel : settings.askingPriceLabel}</span>
        <div className="sale-price">{price}</div>
        <a className="sale-primary-action" href={contact}>{settings.buttonLabel} <ArrowRight size={18}/></a>
        <a className="sale-contact-link" href={contact}>{settings.contactLabel}</a>
      </div>
    </section>
    <footer className="sale-footer"><Link href="/portfolio">{settings.portfolioLabel} <ArrowDown size={14}/></Link></footer>
  </main>;
}
