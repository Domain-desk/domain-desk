export type IncludedMode = "domains" | "text" | "none";

export type DomainRecord = {
  id: string;
  hostname: string;
  category: string;
  status: "active" | "draft" | "sold";
  price: number | null;
  priceType: "fixed" | "percentage" | "request";
  priceRisePercent: number;
  priceRiseStartedAt: string;
  viewerCount: number;
  currency: string;
  includedMode: IncludedMode;
  includedDomains: string[];
  includedText: string;
  registrar: string;
  registrarAccount: string;
  registeredOn: string;
  renewsOn: string;
  dnsProvider: string;
  nameservers: string;
  dnsStatus: "unknown" | "pending" | "active" | "attention";
  internalNotes: string;
  faviconUrl: string;
  title: string;
  description: string;
};

export type DomainPageRecord = {
  id: string;
  hostname: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
};

const inventory: Array<[string, string]> = [
  ["autobod.be", "Automotive"], ["siwak.co", "Lifestyle & Commerce"], ["shifu.bot", "AI & Technology"],
  ["sharpy.be", "Brandable"], ["stayed.be", "Travel & Hospitality"], ["stayed.co", "Travel & Hospitality"],
  ["naturs.be", "Lifestyle & Commerce"], ["naturs.nl", "Lifestyle & Commerce"], ["oxvon.com", "Brandable"],
  ["ivnix.com", "Brandable"], ["ilistai.com", "AI & Technology"], ["porila.com", "Brandable"],
  ["pozby.com", "Brandable"], ["tinybless.com", "Lifestyle & Commerce"], ["nwich.com", "Brandable"],
  ["rofeq.com", "Brandable"], ["bbygifts.com", "Lifestyle & Commerce"], ["jetonspa.com", "Brandable"],
  ["ihsan.biz", "Faith & Learning"], ["sahih.biz", "Faith & Learning"], ["reciter.net", "Faith & Learning"],
  ["islam.xyz", "Faith & Learning"], ["islam.live", "Faith & Learning"], ["widen.ai", "AI & Technology"],
  ["fluxbox.ai", "AI & Technology"], ["ad.fund", "Business & Finance"], ["adfund.net", "Business & Finance"],
  ["akhlak.net", "Faith & Learning"], ["namecheck.me", "AI & Technology"], ["namecheckme.com", "AI & Technology"],
  ["aqidah.org", "Faith & Learning"], ["aqeedah.org", "Faith & Learning"], ["tajwid.net", "Faith & Learning"],
  ["umra.be", "Faith & Learning"], ["shahada.org", "Faith & Learning"], ["akhlak.org", "Faith & Learning"],
  ["akhlaq.net", "Faith & Learning"], ["ijazah.net", "Faith & Learning"], ["nasheed.live", "Faith & Learning"],
  ["jilbab.org", "Lifestyle & Commerce"], ["tapkaart.be", "AI & Technology"], ["islamschool.be", "Faith & Learning"],
  ["imet.si", "AI & Technology"], ["imat.si", "Brandable"], ["imetsi.com", "AI & Technology"],
  ["yups.si", "Brandable"], ["skypath.si", "Travel & Hospitality"], ["build.si", "Brandable"],
];

const bundlePairs: Record<string, string[]> = {
  "naturs.be": ["naturs.nl"], "naturs.nl": ["naturs.be"],
  "stayed.be": ["stayed.co"], "stayed.co": ["stayed.be"],
  "islam.xyz": ["islam.live"], "islam.live": ["islam.xyz"],
  "ad.fund": ["adfund.net"], "adfund.net": ["ad.fund"],
  "namecheck.me": ["namecheckme.com"], "namecheckme.com": ["namecheck.me"],
  "akhlak.net": ["akhlak.org"], "akhlak.org": ["akhlak.net"],
  "imet.si": ["imetsi.com"], "imetsi.com": ["imet.si"],
  "aqidah.org": ["aqeedah.org"], "aqeedah.org": ["aqidah.org"],
};

export const starterDomains: DomainRecord[] = inventory.map(([hostname, category], index) => ({
  id: `seed-${index + 1}`,
  hostname,
  category,
  status: "active",
  price: null,
  priceType: "request",
  priceRisePercent: 7,
  priceRiseStartedAt: "",
  viewerCount: 0,
  currency: "EUR",
  includedMode: bundlePairs[hostname] ? "domains" : "none",
  includedDomains: bundlePairs[hostname] ?? [],
  includedText: "",
  registrar: "",
  registrarAccount: "",
  registeredOn: "",
  renewsOn: "",
  dnsProvider: "",
  nameservers: "",
  dnsStatus: "unknown",
  internalNotes: "",
  faviconUrl: "",
  title: hostname,
  description: "This domain is available for acquisition. Contact us to discuss pricing and secure transfer.",
}));

export const imetRiseStartedAt = "2026-10-13T22:21:15.000Z";
const dayMs = 86_400_000;

function hostnameHash(hostname: string) {
  let hash = 0;
  for (const char of hostname) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function freshDomainClock(hostname: string, now = Date.now()) {
  if (hostname === "imet.si") return { priceRiseStartedAt: imetRiseStartedAt, viewerCount: 0 };
  const hash = hostnameHash(hostname);
  return {
    priceRiseStartedAt: new Date(now - (hash % (20 * 60 * 60)) * 1000).toISOString(),
    viewerCount: 0,
  };
}

export function normalizeViewerCount(value: unknown, hostname: string) {
  const number = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(number) && number >= 0) return Math.min(Math.round(number), 9999);
  return 0;
}

export function hasRiseStart(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function riseSteps(domain: Pick<DomainRecord, "hostname" | "priceRiseStartedAt">, now = Date.now()) {
  const startedAt = hasRiseStart(domain.priceRiseStartedAt)
    ? domain.priceRiseStartedAt
    : domain.hostname === "imet.si" ? imetRiseStartedAt : new Date(now).toISOString();
  const start = Date.parse(startedAt);
  if (now < start) return 0;
  const periods = Math.floor((now - start) / dayMs);
  const legacy = domain.hostname === "imet.si" && startedAt === imetRiseStartedAt;
  return legacy ? periods + 1 : periods;
}

export function currentAskingAmount(domain: Pick<DomainRecord, "hostname" | "price" | "priceRisePercent" | "priceRiseStartedAt">, now = Date.now()) {
  if (domain.price === null) return null;
  const rate = normalizePriceRisePercent(domain.priceRisePercent) / 100;
  return domain.price * Math.pow(1 + rate, riseSteps(domain, now));
}

export function compareByAskingPrice(left: DomainRecord, right: DomainRecord, order: "high" | "low" = "high") {
  const leftAmount = currentAskingAmount(left);
  const rightAmount = currentAskingAmount(right);
  if (leftAmount === null && rightAmount === null) return left.hostname.localeCompare(right.hostname);
  if (leftAmount === null) return 1;
  if (rightAmount === null) return -1;
  const difference = order === "high" ? rightAmount - leftAmount : leftAmount - rightAmount;
  return difference || left.hostname.localeCompare(right.hostname);
}

export function askingPriceLabel(domain: DomainRecord, now = Date.now()) {
  if (domain.priceType === "percentage" && domain.price !== null) return `${domain.price}%`;
  return saleQuote(domain, now).currentLabel;
}

export function saleQuote(domain: Pick<DomainRecord, "hostname" | "price" | "priceType" | "priceRisePercent" | "priceRiseStartedAt" | "currency">, now = Date.now()) {
  const amount = currentAskingAmount(domain, now);
  const percentage = domain.priceType === "percentage" && domain.price !== null;
  const rate = percentage ? 0 : normalizePriceRisePercent(domain.priceRisePercent) / 100;
  const rising = amount !== null && rate > 0;
  const symbol = domain.currency === "USD" ? "$" : domain.currency === "GBP" ? "£" : domain.currency === "CHF" ? "CHF " : "€";
  const format = (value: number) => {
    if (percentage) return `${Number(value.toFixed(2))}%`;
    const rounded = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${symbol}${rounded}`;
  };
  const startedAt = hasRiseStart(domain.priceRiseStartedAt)
    ? domain.priceRiseStartedAt
    : domain.hostname === "imet.si" ? imetRiseStartedAt : new Date(now).toISOString();
  const start = Date.parse(startedAt);
  const firstRise = Number.isFinite(start) ? start : now;
  const periods = now < firstRise ? 0 : Math.floor((now - start) / dayMs);
  const remaining = Math.max(0, Math.floor((firstRise + (periods + 1) * dayMs - now) / 1000));
  const twoDigits = (value: number) => `${value < 10 ? "0" : ""}${value}`;
  return {
    currentLabel: amount === null ? "Price on request" : format(amount),
    nextLabel: amount === null ? "" : format(amount * (1 + (percentage ? 0 : rate))),
    rising,
    request: amount === null,
    riseLabel: rising ? `Price rises ${Number((rate * 100).toFixed(2))}% in` : "Price held",
    timer: `${twoDigits(Math.floor(remaining / 3600))}h ${twoDigits(Math.floor((remaining % 3600) / 60))}m ${twoDigits(remaining % 60)}s`,
  };
}

export function normalizePriceRisePercent(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) return 7;
  return Math.min(number, 100);
}

export function normalizeHostname(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "").replace(/^www\./, "").trim();
}
