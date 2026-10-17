"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { askingPriceLabel, compareByAskingPrice, type DomainRecord } from "@/lib/domains";

export function PortfolioBrowser({ domains, localPreview }: { domains: DomainRecord[]; localPreview: boolean }) {
  const [search, setSearch] = useState("");
  const [priceOrder, setPriceOrder] = useState<"high" | "low">("high");
  const visible = useMemo(() => domains.filter((domain) => `${domain.hostname} ${domain.category}`.toLowerCase().includes(search.toLowerCase())).sort((left, right) => compareByAskingPrice(left, right, priceOrder)), [domains, search, priceOrder]);
  return <section className="portfolio-inventory"><div className="portfolio-tools"><label className="portfolio-search"><Search size={17}/><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search domains"/></label><button type="button" className="sort-header" onClick={() => setPriceOrder((order) => order === "high" ? "low" : "high")} aria-label={priceOrder === "high" ? "Highest price first. Show lowest first." : "Lowest price first. Show highest first."}>Price <span className={`sort-arrow ${priceOrder === "high" ? "down" : "up"}`} aria-hidden="true"/></button></div><div className="public-domain-grid">{visible.map((domain) => <Link className="public-domain-card" href={localPreview ? `/?domain=${encodeURIComponent(domain.hostname)}` : `https://${domain.hostname}/`} key={domain.id}><span className="public-domain-category">{domain.category}</span><strong>{domain.hostname}</strong><span>{askingPriceLabel(domain)}</span></Link>)}{!visible.length && <p className="empty-note">No domains match your search.</p>}</div></section>;
}
