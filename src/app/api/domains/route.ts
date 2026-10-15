import { NextResponse } from "next/server";
import { askingPriceLabel } from "@/lib/domains";
import { getPublicDomains } from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const domains = await getPublicDomains();
  return NextResponse.json(domains.map((domain) => ({ ...domain, askingPriceLabel: askingPriceLabel(domain) })));
}
