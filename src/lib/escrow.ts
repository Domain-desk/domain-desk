import { currentAskingAmount, type DomainRecord } from "@/lib/domains";

const escrowCurrencies: Record<string, "usd" | "euro"> = { USD: "usd", EUR: "euro" };

export function escrowCheckoutConfigured() {
  return Boolean(process.env.ESCROW_API_EMAIL && process.env.ESCROW_API_KEY);
}

export async function startEscrowCheckout(domain: DomainRecord, buyerEmail: string) {
  const email = process.env.ESCROW_API_EMAIL;
  const key = process.env.ESCROW_API_KEY;
  if (!email || !key) return { error: "Escrow is not connected yet. Add ESCROW_API_EMAIL and ESCROW_API_KEY for the account that receives the sale." } as const;
  const amount = currentAskingAmount(domain);
  const currency = escrowCurrencies[domain.currency];
  if (domain.priceType === "percentage" || amount === null || !currency) return { error: "This name does not have a fixed euro or dollar price yet." } as const;
  const names = [domain.hostname, ...(domain.includedMode === "domains" ? domain.includedDomains : [])];
  const base = (process.env.ESCROW_API_BASE || "https://api.escrow.com").replace(/\/$/, "");
  const response = await fetch(`${base}/integration/pay/2018-03-31`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${email}:${key}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      currency,
      description: `Purchase of ${names.join(", ")}`,
      reference: `${domain.hostname}-${amount}-${buyerEmail}`,
      return_url: `https://${domain.hostname}/`,
      redirect_type: "manual",
      items: [{
        title: domain.hostname,
        description: names.join(", "),
        type: "domain_name",
        inspection_period: 259200,
        quantity: 1,
        extra_attributes: { concierge: true, with_content: false, domain_names: names },
        schedule: [{ amount: Math.round(amount), payer_customer: buyerEmail, beneficiary_customer: "me" }],
        fees: [
          { payer_customer: buyerEmail, split: "1", type: "escrow" },
          { payer_customer: buyerEmail, split: "1", type: "concierge" },
        ],
      }],
      parties: [
        { role: "buyer", customer: buyerEmail, agreed: true, initiator: true },
        { role: "seller", customer: "me", agreed: true },
      ],
    }),
  });
  const payload = await response.json().catch(() => null) as { landing_page?: string; error?: string; message?: string } | null;
  if (!response.ok || !payload?.landing_page) {
    const detail = payload?.error || payload?.message;
    return { error: detail ? `Escrow did not start the purchase. ${detail}` : "Escrow did not start the purchase." } as const;
  }
  const landing = new URL(payload.landing_page);
  if (landing.protocol !== "https:" || !["www.escrow.com", "www.escrow-sandbox.com"].includes(landing.hostname)) return { error: "Escrow returned an unexpected payment page." } as const;
  return { landingPage: landing.toString() } as const;
}
