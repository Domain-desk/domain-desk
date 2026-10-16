import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeHostname } from "@/lib/domains";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";

const eventSchema = z.object({
  hostname: z.string().trim().min(3).max(253).transform(normalizeHostname),
  theme: z.enum(["light", "dark"]),
  event: z.enum(["view", "inquiry"]),
});

export async function POST(request: Request) {
  if (!hasSupabaseConfig) return NextResponse.json({ ok: true });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("theme_events").insert(parsed.data);
  if (error) return NextResponse.json({ ok: false }, { status: 202 });
  return NextResponse.json({ ok: true });
}
