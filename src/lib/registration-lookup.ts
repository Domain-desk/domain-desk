type RdapEvent = { eventAction?: string; eventDate?: string };
type RdapEntity = { roles?: string[]; vcardArray?: unknown[] };
type RdapLink = { rel?: string; href?: string };
type RdapDocument = { events?: RdapEvent[]; entities?: RdapEntity[]; links?: RdapLink[] };

let tldServers: Map<string, string> | null = null;

async function serverForTld(tld: string) {
  if (!tldServers) {
    tldServers = new Map();
    const response = await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = await response.json() as { services?: Array<[string[], string[]]> };
      for (const [names, urls] of data.services ?? []) {
        const base = urls[0];
        if (!base) continue;
        for (const name of names) tldServers.set(name.toLowerCase(), base.endsWith("/") ? base : `${base}/`);
      }
    }
  }
  return tldServers.get(tld) ?? "";
}

function dateOnly(value: string | undefined) {
  if (!value) return "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : "";
}

function registrarName(document: RdapDocument) {
  const entity = document.entities?.find((item) => item.roles?.includes("registrar"));
  const rows = Array.isArray(entity?.vcardArray?.[1]) ? entity.vcardArray[1] as unknown[] : [];
  const name = rows.find((row) => Array.isArray(row) && row[0] === "fn" && row[3] !== "org");
  return Array.isArray(name) && typeof name[3] === "string" ? name[3] : "";
}

async function readRdap(url: string) {
  const response = await fetch(url, { headers: { accept: "application/rdap+json" }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return undefined;
  return await response.json() as RdapDocument;
}

export async function lookupRegistration(hostname: string) {
  try {
    const tld = hostname.split(".").pop()?.toLowerCase() ?? "";
    const base = await serverForTld(tld);
    if (!base) return {};
    const document = await readRdap(`${base}domain/${encodeURIComponent(hostname)}`);
    if (!document) return {};
    let registrar = registrarName(document);
    if (!registrar) {
      const related = document.links?.find((link) => link.rel === "related" && link.href);
      if (related?.href) registrar = registrarName(await readRdap(related.href) ?? {});
    }
    return {
      registrar,
      registeredOn: dateOnly(document.events?.find((event) => event.eventAction === "registration")?.eventDate),
      renewsOn: dateOnly(document.events?.find((event) => event.eventAction === "expiration")?.eventDate),
    };
  } catch {
    return {};
  }
}
