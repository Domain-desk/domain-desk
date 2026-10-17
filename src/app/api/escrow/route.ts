import { NextResponse } from "next/server";
import { z } from "zod";
import { startEscrowCheckout } from "@/lib/escrow";
import { getDomain } from "@/lib/public-data";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  hostname: z.string().trim().min(3).max(253),
  email: z.string().trim().email().max(200),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the email address Escrow should use for this purchase." }, { status: 400 });
  const domain = await getDomain(parsed.data.hostname);
  if (!domain || domain.status !== "active") return NextResponse.json({ error: "This domain is not available." }, { status: 404 });
  const result = await startEscrowCheckout(domain, parsed.data.email);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error.includes("not connected") ? 503 : 422 });
  return NextResponse.json({ landingPage: result.landingPage });
}
