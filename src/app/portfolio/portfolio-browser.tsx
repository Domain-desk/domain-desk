"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { askingPriceLabel, type DomainRecord } from "@/lib/domains";

export function PortfolioBrowser({ domains, localPreview }: { domains: DomainRecord[]; localPreview: boolean }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => domains.filter((domain) => `${domain.hostname} ${domain.category}`.toLowerCase().includes(search.toLowerCase())), [domains, search]);
  return <section className="portfolio-inventory"><label className="portfolio-search"><Search size={17}/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search domains"/></label><div className="public-domain-grid">{visible.map((domain) => <Link className="public-domain-card" href={localPreview ? `/?domain=${encodeURIComponent(domain.hostname)}` : `https://${domain.hostname}/`} key={domain.id}><span className="public-domain-category">{domain.category}</span><strong>{domain.hostname}</strong><span>{askingPriceLabel(domain)}</span></Link>)}{!visible.length && <p className="empty-note">No domains match your search.</p>}</div></section>;
}
