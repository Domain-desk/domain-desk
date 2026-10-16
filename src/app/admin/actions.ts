"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { imetRiseStartedAt, normalizeHostname, normalizePriceRisePercent, normalizeViewerCount, type DomainRecord } from "@/lib/domains";
import { deleteDomainRecord, deletePageRecord, readPortfolio, saveDomainRecord, savePageRecord, saveSettingsRecord } from "@/lib/portfolio-store";
import { lookupRegistration } from "@/lib/registration-lookup";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/server";

const domainSchema = z.object({
  hostname: z.string().trim().min(3, "Enter a domain such as a.com.").transform(normalizeHostname).refine((v) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(v), "Enter a valid domain name, such as a.com or ad.bot."),
  title: z.string().trim().min(1, "Enter a page title.").max(120),
  category: z.string().trim().min(1, "Enter a category.").max(80),
  description: z.string().max(2000),
  status: z.enum(["active", "draft", "sold"]),
  priceType: z.enum(["fixed", "percentage", "request"]),
  price: z.string().optional(),
  priceRisePercent: z.string().optional(),
  currency: z.string().length(3),
  includedMode: z.enum(["domains", "text", "none"]),
  includedDomains: z.string().optional(),
  includedText: z.string().max(1000).optional(),
  registrar: z.string().max(120), registrarAccount: z.string().max(160),
  registeredOn: z.string().optional(), renewsOn: z.string().optional(),
  dnsProvider: z.string().max(120), nameservers: z.string().max(1000),
  dnsStatus: z.enum(["unknown", "pending", "active", "attention"]), internalNotes: z.string().max(2000), faviconUrl: z.string().max(2000),
});

const siteSettingsSchema = z.object({
  availabilityLabel: z.string().trim().min(1).max(80),
  priceOnRequestLabel: z.string().trim().min(1).max(60),
  askingPriceLabel: z.string().trim().min(1).max(60),
  includedLabel: z.string().trim().max(80),
  transferLabel: z.string().trim().min(1).max(60),
  transferValue: z.string().trim().min(1).max(160),
  paymentLabel: z.string().trim().min(1).max(60),
  paymentValue: z.string().trim().min(1).max(160),
  ownershipLabel: z.string().trim().min(1).max(60),
  ownershipValue: z.string().trim().min(1).max(160),
  buttonLabel: z.string().trim().min(1).max(80),
  contactLabel: z.string().trim().min(1).max(60),
  contactEmail: z.string().trim().email().max(254),
  portfolioLabel: z.string().trim().min(1).max(80),
});

function formObject(form: FormData) {
  return Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
}

function refreshPublicPages() {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/admin");
}

export async function signIn(form: FormData) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8) }).safeParse(formObject(form));
  if (!parsed.success) redirect("/admin?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect("/admin?error=login");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin");
}

export async function saveDomain(form: FormData) {
  const raw = formObject(form);
  const hostname = String(raw.hostname ?? "").trim();
  if (!String(raw.title ?? "").trim()) raw.title = hostname;
  if (!String(raw.category ?? "").trim()) raw.category = "Brandable";
  if (!String(raw.currency ?? "").trim()) raw.currency = "EUR";
  const parsed = domainSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] ? `${String(issue.path[0]).replace(/([A-Z])/g, " $1").toLowerCase()}: ` : "";
    return { error: `${field}${issue?.message ?? "Check the domain details."}` };
  }
  const value = parsed.data;
  const id = String(form.get("id") ?? "");
  const price = value.price?.trim() ? Number(value.price) : null;
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000_000)) return { error: "Enter a valid price or percentage." };
  const priceRisePercent = normalizePriceRisePercent(value.priceRisePercent?.trim() ? Number(value.priceRisePercent) : 7);
  const existing = !hasSupabaseConfig ? (await readPortfolio()).domains.find((item) => item.id === id || item.hostname === value.hostname) : undefined;
  const priceUnchanged = Boolean(existing && existing.price === price && existing.priceRisePercent === priceRisePercent);
  const priceRiseStartedAt = priceUnchanged && existing?.priceRiseStartedAt
    ? existing.priceRiseStartedAt
    : value.hostname === "imet.si" && price === null && priceRisePercent === 7 && (!existing || existing.price === null)
      ? existing?.priceRiseStartedAt || imetRiseStartedAt
      : new Date().toISOString();
  let registrar = value.registrar;
  let registeredOn = value.registeredOn ?? "";
  let renewsOn = value.renewsOn ?? "";
  if (!registrar || !registeredOn || !renewsOn) {
    const found = await lookupRegistration(value.hostname);
    registrar = registrar || found.registrar || "";
    registeredOn = registeredOn || found.registeredOn || "";
    renewsOn = renewsOn || found.renewsOn || "";
  }
  const record: DomainRecord = {
    id, hostname: value.hostname, title: value.title, category: value.category, description: value.description,
    status: value.status, price, priceType: value.priceType, priceRisePercent, priceRiseStartedAt, viewerCount: normalizeViewerCount(existing?.viewerCount, value.hostname), currency: value.currency,
    includedMode: value.includedMode,
    includedDomains: value.includedMode === "domains" ? (value.includedDomains ?? "").split(/[\n,]/).map(normalizeHostname).filter(Boolean) : [],
    includedText: value.includedMode === "text" ? value.includedText ?? "" : "",
    registrar, registrarAccount: value.registrarAccount, registeredOn, renewsOn,
    dnsProvider: value.dnsProvider, nameservers: value.nameservers, dnsStatus: value.dnsStatus, internalNotes: value.internalNotes, faviconUrl: value.faviconUrl,
  };
  const registrationDetail = [registrar && `Registered at ${registrar}`, registeredOn && `registered ${registeredOn}`, renewsOn && `expires ${renewsOn}`].filter(Boolean).join(", ");
  if (!hasSupabaseConfig) {
    const saved = await saveDomainRecord(record);
    if (saved.error) return saved;
    refreshPublicPages();
    return { success: true, detail: registrationDetail ? `Saved. ${registrationDetail}.` : "Saved." };
  }
  const { supabase } = await requireAdmin();
  const payload = {
    hostname: value.hostname, title: value.title, category: value.category, description: value.description,
    status: value.status, price_type: value.priceType, price, price_rise_percent: priceRisePercent, price_rise_started_at: priceRiseStartedAt, viewer_count: record.viewerCount, currency: value.currency,
    included_mode: value.includedMode,
    included_domains: value.includedMode === "domains" ? (value.includedDomains ?? "").split(/[\n,]/).map(normalizeHostname).filter(Boolean) : [],
    included_text: value.includedMode === "text" ? value.includedText ?? "" : "", favicon_url: value.faviconUrl || null,
  };
  const result = id && !id.startsWith("seed-")
    ? await supabase.from("domains").update(payload).eq("id", id)
    : await supabase.from("domains").upsert(payload, { onConflict: "hostname" });
  if (result.error) return { error: result.error.message };
  const operations = {
    hostname: value.hostname, registrar: registrar || null, registrar_account: value.registrarAccount || null,
    registered_on: registeredOn || null, renews_on: renewsOn || null,
    dns_provider: value.dnsProvider || null, nameservers: value.nameservers || null,
    dns_status: value.dnsStatus, internal_notes: value.internalNotes,
  };
  const opResult = await supabase.from("domain_operations").upsert(operations, { onConflict: "hostname" });
  if (opResult.error) return { error: opResult.error.message };
  refreshPublicPages();
  return { success: true, detail: registrationDetail ? `Saved. ${registrationDetail}.` : "Saved." };
}

export async function deleteDomain(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "Choose a domain to remove." };
  if (!hasSupabaseConfig) {
    const removed = await deleteDomainRecord(id);
    if (removed.error) return removed;
    refreshPublicPages();
    return { success: true };
  }
  const { supabase } = await requireAdmin();
  if (id.startsWith("seed-")) return { error: "Connect the database before deleting a starter inventory item." };
  const { error } = await supabase.from("domains").delete().eq("id", id);
  return error ? { error: error.message } : { success: true };
}

export async function uploadFavicon(form: FormData) {
  const file = form.get("file");
  const hostname = normalizeHostname(String(form.get("hostname") ?? ""));
  if (!(file instanceof File) || !hostname) return { error: "Enter the domain name, then choose a favicon file." };
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
  if (!allowed.includes(file.type) || file.size > 1024 * 1024) return { error: "Use an ICO, PNG, SVG, JPEG or WebP file under 1 MB." };
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  if (!hasSupabaseConfig) {
    const filename = `${hostname.replace(/[^a-z0-9.-]/g, "")}-${Date.now()}.${extension}`;
    const directory = path.join(process.cwd(), "public", "favicons");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
    return { url: `/favicons/${filename}` };
  }
  const { supabase } = await requireAdmin();
  const storagePath = `${hostname}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("domain-favicons").upload(storagePath, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("domain-favicons").getPublicUrl(storagePath);
  return { url: data.publicUrl };
}

export async function saveSitePage(form: FormData) {
  const parsed = z.object({
    hostname: z.string().min(3).transform(normalizeHostname),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters and numbers with hyphens between words."),
    title: z.string().trim().min(1).max(120), content: z.string().max(12000),
    published: z.enum(["true", "false"]),
  }).safeParse(formObject(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the page details." };
  const id = String(form.get("id") ?? "");
  const value = { ...parsed.data, published: parsed.data.published === "true" };
  if (!hasSupabaseConfig) {
    const saved = await savePageRecord({ id, ...value });
    if (saved.error) return saved;
    refreshPublicPages();
    return { success: true };
  }
  const { supabase } = await requireAdmin();
  const result = id && !id.startsWith("demo-")
    ? await supabase.from("domain_pages").update(value).eq("id", id)
    : await supabase.from("domain_pages").upsert(value, { onConflict: "hostname,slug" });
  return result.error ? { error: result.error.message } : { success: true };
}

export async function saveSiteSettings(form: FormData) {
  const parsed = siteSettingsSchema.safeParse(formObject(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the website template details." };
  const value = parsed.data;
  if (!hasSupabaseConfig) {
    await saveSettingsRecord(value);
    refreshPublicPages();
    return { success: true };
  }
  const { supabase } = await requireAdmin();
  const payload = {
    id: "global",
    availability_label: value.availabilityLabel,
    price_on_request_label: value.priceOnRequestLabel,
    asking_price_label: value.askingPriceLabel,
    included_label: value.includedLabel,
    transfer_label: value.transferLabel,
    transfer_value: value.transferValue,
    payment_label: value.paymentLabel,
    payment_value: value.paymentValue,
    ownership_label: value.ownershipLabel,
    ownership_value: value.ownershipValue,
    button_label: value.buttonLabel,
    contact_label: value.contactLabel,
    contact_email: value.contactEmail,
    portfolio_label: value.portfolioLabel,
  };
  const { error } = await supabase.from("site_settings").upsert(payload, { onConflict: "id" });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/portfolio");
  return { success: true };
}

export async function deleteSitePage(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!id) return { error: "Choose a page to remove." };
  if (!hasSupabaseConfig) {
    const removed = await deletePageRecord(id);
    if (removed.error) return removed;
    refreshPublicPages();
    return { success: true };
  }
  const { supabase } = await requireAdmin();
  if (id.startsWith("demo-")) return { error: "Connect the database before removing this page." };
  const { error } = await supabase.from("domain_pages").delete().eq("id", id);
  return error ? { error: error.message } : { success: true };
}
