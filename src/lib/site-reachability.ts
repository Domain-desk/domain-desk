const cache = new Map<string, { live: boolean; checkedAt: number }>();
const cacheWindow = 10 * 60 * 1000;

async function probe(hostname: string) {
  const cached = cache.get(hostname);
  if (cached && Date.now() - cached.checkedAt < cacheWindow) return cached.live;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  let live = false;
  try {
    const response = await fetch(`https://${hostname}/`, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { "user-agent": "DomainDesk-live-check" },
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let body = "";
    while (reader && body.length < 120000) {
      const chunk = await reader.read();
      if (chunk.done) break;
      body += decoder.decode(chunk.value, { stream: true });
      if (body.includes('data-domain-desk="sale"')) break;
    }
    await reader?.cancel().catch(() => undefined);
    live = response.ok && body.includes('data-domain-desk="sale"');
  } catch {
    live = false;
  } finally {
    clearTimeout(timer);
  }
  cache.set(hostname, { live, checkedAt: Date.now() });
  return live;
}

export async function liveHostnames(hostnames: string[]) {
  const unique = [...new Set(hostnames.map((hostname) => hostname.trim().toLowerCase()).filter(Boolean))];
  const live = new Set<string>();
  for (let index = 0; index < unique.length; index += 16) {
    const batch = unique.slice(index, index + 8);
    const results = await Promise.all(batch.map(async (hostname) => [hostname, await probe(hostname)] as const));
    for (const [hostname, isLive] of results) if (isLive) live.add(hostname);
  }
  return [...live];
}
