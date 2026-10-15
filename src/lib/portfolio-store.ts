import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { freshDomainClock, hasRiseStart, imetRiseStartedAt, normalizePriceRisePercent, normalizeViewerCount, starterDomains, type DomainPageRecord, type DomainRecord } from "@/lib/domains";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings";

export type PortfolioData = {
  domains: DomainRecord[];
  pages: DomainPageRecord[];
  settings: SiteSettings;
};

const filePath = path.join(process.cwd(), "data", "portfolio.json");

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>) {
  const run = queue.then(task, task);
  queue = run.then(() => undefined, () => undefined);
  return run;
}

function domainWithDefaults(domain: DomainRecord, nowIso: string) {
  const priceRiseStartedAt = hasRiseStart(domain.priceRiseStartedAt)
    ? new Date(Date.parse(domain.priceRiseStartedAt)).toISOString()
    : freshDomainClock(domain.hostname, Date.parse(nowIso)).priceRiseStartedAt;
  const viewerCount = normalizeViewerCount(domain.viewerCount, domain.hostname);
  const filled = !hasRiseStart(domain.priceRiseStartedAt) || !Number.isFinite(domain.viewerCount);
  return {
    filled,
    record: { ...domain, priceRisePercent: normalizePriceRisePercent(domain.priceRisePercent), priceRiseStartedAt, viewerCount },
  };
}

async function load(): Promise<PortfolioData> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as Partial<PortfolioData>;
    const nowIso = new Date().toISOString();
    const normalized = (parsed.domains ?? []).map((domain) => domainWithDefaults(domain, nowIso));
    const data: PortfolioData = {
      domains: normalized.map((item) => item.record),
      pages: parsed.pages ?? [],
      settings: { ...defaultSiteSettings, ...parsed.settings },
    };
    if (normalized.some((item) => item.filled)) await persist(data);
    return data;
  } catch {
    const nowIso = new Date().toISOString();
    const initial: PortfolioData = {
      domains: starterDomains.map((domain) => domainWithDefaults(domain, nowIso).record),
      pages: [],
      settings: defaultSiteSettings,
    };
    await persist(initial);
    return initial;
  }
}

async function persist(data: PortfolioData) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export function readPortfolio() {
  return enqueue(load);
}

export function saveDomainRecord(record: DomainRecord) {
  return enqueue(async () => {
    const data = await load();
    const id = record.id || randomUUID();
    const next = domainWithDefaults({ ...record, id }, record.priceRiseStartedAt || new Date().toISOString()).record;
    const index = data.domains.findIndex((item) => item.id === id);
    const previous = index >= 0 ? data.domains[index] : undefined;
    if (data.domains.some((item) => item.hostname === next.hostname && item.id !== id)) {
      return { error: "That domain is already in the inventory." };
    }
    if (previous && previous.hostname !== next.hostname) {
      data.pages = data.pages.map((page) => page.hostname === previous.hostname ? { ...page, hostname: next.hostname } : page);
    }
    if (index >= 0) data.domains[index] = next;
    else data.domains.push(next);
    data.domains.sort((left, right) => left.hostname.localeCompare(right.hostname));
    await persist(data);
    return { success: true as const };
  });
}

export function deleteDomainRecord(id: string) {
  return enqueue(async () => {
    const data = await load();
    const existing = data.domains.find((item) => item.id === id);
    if (!existing) return { error: "That domain is no longer in the inventory." };
    data.domains = data.domains.filter((item) => item.id !== id);
    data.pages = data.pages.filter((page) => page.hostname !== existing.hostname);
    await persist(data);
    return { success: true as const };
  });
}

export function savePageRecord(page: DomainPageRecord) {
  return enqueue(async () => {
    const data = await load();
    if (!data.domains.some((domain) => domain.hostname === page.hostname)) return { error: "Choose a domain that is already in the inventory." };
    const id = page.id || randomUUID();
    const next = { ...page, id };
    const index = data.pages.findIndex((item) => item.id === id);
    if (data.pages.some((item) => item.hostname === next.hostname && item.slug === next.slug && item.id !== id)) {
      return { error: "That page already exists on this domain." };
    }
    if (index >= 0) data.pages[index] = next;
    else data.pages.push(next);
    await persist(data);
    return { success: true as const };
  });
}

export function deletePageRecord(id: string) {
  return enqueue(async () => {
    const data = await load();
    if (!data.pages.some((page) => page.id === id)) return { error: "That page is no longer available." };
    data.pages = data.pages.filter((page) => page.id !== id);
    await persist(data);
    return { success: true as const };
  });
}

export function saveSettingsRecord(settings: SiteSettings) {
  return enqueue(async () => {
    const data = await load();
    data.settings = settings;
    await persist(data);
    return { success: true as const };
  });
}
