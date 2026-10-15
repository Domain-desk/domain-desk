"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Activity, ArrowUpRight, BadgePercent, Blocks, CircleHelp, Clock3, ExternalLink, Globe2, LayoutDashboard, LayoutTemplate, LogOut, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { askingPriceLabel, type DomainPageRecord, type DomainRecord } from "@/lib/domains";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { deleteDomain, deleteSitePage, saveDomain, saveSitePage, saveSiteSettings, signOut, uploadFavicon } from "./actions";

type Section = "Overview" | "Domains" | "Operations" | "Site pages" | "Website template" | "Settings";
const navItems: Array<{ label: Section; icon: typeof LayoutDashboard }> = [
  { label: "Overview", icon: LayoutDashboard }, { label: "Domains", icon: Globe2 },
  { label: "Operations", icon: Activity }, { label: "Site pages", icon: Blocks }, { label: "Website template", icon: LayoutTemplate }, { label: "Settings", icon: Settings2 },
];
const emptyDomain = (): DomainRecord => ({
  id: "", hostname: "", category: "Brandable", status: "draft", price: null, priceType: "request", priceRisePercent: 7, priceRiseStartedAt: "", viewerCount: 0, currency: "EUR",
  includedMode: "none", includedDomains: [], includedText: "", registrar: "", registrarAccount: "", registeredOn: "",
  renewsOn: "", dnsProvider: "", nameservers: "", dnsStatus: "unknown", internalNotes: "", faviconUrl: "", title: "", description: "",
});

function actionError(result: unknown) {
  return result && typeof result === "object" && "error" in result && typeof result.error === "string" ? result.error : "";
}

function money(domain: DomainRecord) {
  return askingPriceLabel(domain);
}

export function AdminConsole({ initialDomains, initialPages, initialSettings = defaultSiteSettings, demoMode, backend = "supabase", email }: { initialDomains: DomainRecord[]; initialPages: DomainPageRecord[]; initialSettings?: SiteSettings; demoMode: boolean; backend?: "supabase" | "server"; email?: string }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>("Overview");
  const [domains, setDomains] = useState(initialDomains);
  const [pages, setPages] = useState(initialPages);
  const [siteSettings, setSiteSettings] = useState(initialSettings);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<DomainRecord | null>(null);
  const [editingPage, setEditingPage] = useState<DomainPageRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { setDomains(initialDomains); }, [initialDomains]);
  useEffect(() => { setPages(initialPages); }, [initialPages]);
  useEffect(() => { setSiteSettings(initialSettings); }, [initialSettings]);
  useEffect(() => {
    if (!demoMode) return;
    try {
      const stored = localStorage.getItem("domain-platform-demo");
      if (stored) {
        const saved = JSON.parse(stored) as DomainRecord[];
        const timer = window.setTimeout(() => setDomains(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch { localStorage.removeItem("domain-platform-demo"); }
  }, [demoMode]);
  useEffect(() => {
    if (!demoMode) return;
    try {
      const stored = localStorage.getItem("domain-platform-demo-template");
      if (stored) {
        const saved = { ...defaultSiteSettings, ...JSON.parse(stored) } as SiteSettings;
        const timer = window.setTimeout(() => setSiteSettings(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch { localStorage.removeItem("domain-platform-demo-template"); }
  }, [demoMode]);
  useEffect(() => {
    if (!demoMode) return;
    try {
      const stored = localStorage.getItem("domain-platform-demo-pages");
      if (stored) {
        const saved = JSON.parse(stored) as DomainPageRecord[];
        const timer = window.setTimeout(() => setPages(saved), 0);
        return () => window.clearTimeout(timer);
      }
    } catch { localStorage.removeItem("domain-platform-demo-pages"); }
  }, [demoMode]);
  const visible = useMemo(() => domains.filter((item) => `${item.hostname} ${item.category} ${item.registrar}`.toLowerCase().includes(filter.toLowerCase())), [domains, filter]);
  const activeCount = domains.filter((item) => item.status === "active").length;
  const registrarCount = new Set(domains.map((item) => item.registrar).filter(Boolean)).size;

  function openEditor(record?: DomainRecord) { setEditing(record ? { ...record } : emptyDomain()); setNotice(""); }
  function openPageEditor(record?: DomainPageRecord) { setEditingPage(record ? { ...record } : { id: "", hostname: domains[0]?.hostname ?? "", slug: "about", title: "About", content: "", published: false }); setNotice(""); }

  async function submitDomain(form: FormData) {
    const val = (key: string) => String(form.get(key) ?? "").trim();
    const number = val("price") ? Number(val("price")) : null;
    if (!val("hostname")) { setNotice("Enter the domain name first."); return; }
    if (demoMode) {
      const hostname = val("hostname").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      const record: DomainRecord = {
        id: editing?.id || `demo-${Date.now()}`, hostname, title: val("title") || hostname, category: val("category") || "Brandable",
        status: val("status") as DomainRecord["status"], priceType: val("priceType") as DomainRecord["priceType"], price: number, priceRisePercent: val("priceRisePercent") ? Number(val("priceRisePercent")) : 7, priceRiseStartedAt: "", viewerCount: 0,
        currency: val("currency") || "EUR", includedMode: val("includedMode") as DomainRecord["includedMode"],
        includedDomains: val("includedDomains").split(/[\n,]/).map((name) => name.trim()).filter(Boolean), includedText: val("includedText"),
        registrar: val("registrar"), registrarAccount: val("registrarAccount"), registeredOn: val("registeredOn"), renewsOn: val("renewsOn"),
        dnsProvider: val("dnsProvider"), nameservers: val("nameservers"), dnsStatus: val("dnsStatus") as DomainRecord["dnsStatus"],
        internalNotes: val("internalNotes"), faviconUrl: val("faviconUrl"), description: val("description"),
      };
      const next = domains.some((item) => item.id === record.id) ? domains.map((item) => item.id === record.id ? record : item) : [...domains, record];
      setDomains(next);
      localStorage.setItem("domain-platform-demo", JSON.stringify(next));
      setEditing(null); setNotice("Saved in this browser’s demo storage."); return;
    }
    startTransition(async () => {
      const result = await saveDomain(form);
      const error = actionError(result);
      if (error) { setNotice(error); return; }
      const detail = result && typeof result === "object" && "detail" in result && typeof result.detail === "string" ? result.detail : "";
      setEditing(null);
      if (detail) setNotice(detail);
      router.refresh();
    });
  }

  function removeRecord(record: DomainRecord) {
    if (!window.confirm(`Remove ${record.hostname} from the domain inventory?`)) return;
    if (demoMode) {
      const next = domains.filter((item) => item.id !== record.id);
      setDomains(next); localStorage.setItem("domain-platform-demo", JSON.stringify(next));
      return;
    }
    const form = new FormData(); form.set("id", record.id);
    startTransition(async () => {
      const result = await deleteDomain(form);
      const error = actionError(result);
      if (error) setNotice(error); else router.refresh();
    });
  }

  async function submitPage(form: FormData) {
    if (demoMode) {
      const val = (key: string) => String(form.get(key) ?? "").trim();
      const page: DomainPageRecord = { id: editingPage?.id || `demo-${Date.now()}`, hostname: val("hostname"), slug: val("slug").toLowerCase(), title: val("title"), content: val("content"), published: form.getAll("published").includes("true") };
      if (!page.hostname || !page.slug || !page.title) { setNotice("Choose a domain, page name and page title."); return; }
      const next = pages.some((item) => item.id === page.id) ? pages.map((item) => item.id === page.id ? page : item) : [...pages, page];
      setPages(next); localStorage.setItem("domain-platform-demo-pages", JSON.stringify(next)); setEditingPage(null); setNotice("Saved in this browser’s demo storage."); return;
    }
    startTransition(async () => {
      const result = await saveSitePage(form);
      const error = actionError(result);
      if (error) { setNotice(error); return; }
      setEditingPage(null); router.refresh();
    });
  }

  async function submitTemplateSettings(form: FormData) {
    const value = Object.fromEntries(Object.keys(defaultSiteSettings).map((key) => [key, String(form.get(key) ?? "").trim()])) as SiteSettings;
    if (!value.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)) { setNotice("Enter a valid contact email address."); return; }
    if (demoMode) {
      setSiteSettings(value);
      localStorage.setItem("domain-platform-demo-template", JSON.stringify(value));
      setNotice("Shared website template saved in this browser’s demo storage.");
      return;
    }
    const data = new FormData();
    for (const [key, entry] of Object.entries(value)) data.set(key, entry);
    startTransition(async () => {
      const result = await saveSiteSettings(data);
      const error = actionError(result);
      if (error) { setNotice(error); return; }
      setSiteSettings(value);
      setNotice("Shared website template saved.");
      router.refresh();
    });
  }

  function removePage(page: DomainPageRecord) {
    if (!window.confirm(`Delete the page “${page.title}” from ${page.hostname}?`)) return;
    if (demoMode) {
      const next = pages.filter((item) => item.id !== page.id);
      setPages(next); localStorage.setItem("domain-platform-demo-pages", JSON.stringify(next)); return;
    }
    const form = new FormData(); form.set("id", page.id);
    startTransition(async () => {
      const result = await deleteSitePage(form);
      const error = actionError(result);
      if (error) setNotice(error); else router.refresh();
    });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/"><span className="brand-mark">D</span><span>Domain Desk<small>PORTFOLIO MANAGER</small></span></Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Admin sections">
          {navItems.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setSection(label)} className={section === label ? "side-link active" : "side-link"}><Icon size={17}/>{label}</button>)}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="secure-card"><ShieldCheck size={18}/><div><strong>Private workspace</strong><span>Only approved admins</span></div></div>
        <div className="profile-row"><span className="avatar">{email?.[0]?.toUpperCase() || "J"}</span><span className="profile-copy"><strong>{email || "Local preview"}</strong><small>{demoMode ? "Demo mode" : "Administrator"}</small></span>{!demoMode && backend === "supabase" ? <form action={signOut}><button className="icon-button" type="submit" aria-label="Sign out"><LogOut size={17}/></button></form> : <Link aria-label="View public site" href="/" className="icon-button"><CircleHelp size={17}/></Link>}</div>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar"><div><span className="breadcrumb">Workspace <span>/</span> {section}</span><h1>{section}</h1></div><div className="topbar-actions"><Link href="/portfolio" className="quiet-button"><ExternalLink size={15}/> View portfolio</Link>{section === "Website template" ? <Link href="/" className="primary-button"><ExternalLink size={15}/> Preview website</Link> : <Button className="primary-button" onClick={() => section === "Site pages" ? openPageEditor() : openEditor()}><Plus size={16}/> {section === "Site pages" ? "Add page" : "Add domain"}</Button>}</div></header>
        {demoMode && <div className="demo-banner"><span className="demo-dot"/><div><strong>Preview mode</strong><span>Edits save only in this browser. Connect Supabase to turn on secure, shared storage and sign-in.</span></div><Link href="/setup">Setup guide <ArrowUpRight size={14}/></Link></div>}
        {notice && !editing && <div className="notice" role="status">{notice}</div>}
        {section === "Overview" && <>
          <section className="metric-grid" aria-label="Portfolio summary">
            <Metric label="Total domains" value={domains.length} note="In your inventory" icon={<Globe2 size={18}/>} />
            <Metric label="Active listings" value={activeCount} note="Visible to visitors" icon={<Activity size={18}/>} />
            <Metric label="Bundle listings" value={domains.filter((d) => d.includedMode === "domains" && d.includedDomains.length > 0).length} note="Related names grouped" icon={<Blocks size={18}/>} />
            <Metric label="Registrars tracked" value={registrarCount} note={registrarCount ? "Across your domains" : "Add registrar details"} icon={<BadgePercent size={18}/>} />
          </section>
          <section className="content-card"><div className="card-heading"><div><h2>Domain inventory</h2><p>Manage names, pricing, bundles and ownership details.</p></div><button className="text-button" onClick={() => setSection("Domains")}>View all <ArrowUpRight size={15}/></button></div><DomainTable records={domains.slice(0, 7)} demoMode={demoMode} onEdit={openEditor} onDelete={removeRecord}/></section>
          <div className="overview-bottom"><section className="content-card"><div className="card-heading"><div><h2>Renewal watch</h2><p>Dates and registrar accounts at a glance.</p></div><Clock3 size={17} className="muted-icon"/></div><div className="renewal-list">{domains.filter((d) => d.renewsOn).slice(0, 4).map((d) => <div key={d.id}><span className="renewal-domain">{d.hostname}<small>{d.registrar || "Registrar not set"}</small></span><time>{d.renewsOn}</time></div>)}{!domains.some((d) => d.renewsOn) && <p className="empty-note">Add renewal dates in a domain’s registrar details and they’ll appear here.</p>}</div></section><section className="content-card quick-card"><div className="card-heading"><div><h2>Quick actions</h2><p>Keep your portfolio up to date.</p></div></div><button onClick={() => openEditor()}><Plus size={16}/> Add a domain</button><button onClick={() => setSection("Operations")}><SlidersHorizontal size={16}/> Review registrar details</button><button onClick={() => setSection("Domains")}><Upload size={16}/> Update a favicon</button></section></div>
        </>}
        {section === "Domains" && <section className="content-card"><div className="card-heading"><div><h2>All domains <span className="count-chip">{domains.length}</span></h2><p>Search and edit your domain names and sale settings.</p></div><label className="search-control"><Search size={16}/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search domains"/></label></div><DomainTable records={visible} demoMode={demoMode} onEdit={openEditor} onDelete={removeRecord}/></section>}
        {section === "Operations" && <section className="content-card"><div className="card-heading"><div><h2>Registrar & DNS inventory</h2><p>Private operational details for every domain.</p></div><label className="search-control"><Search size={16}/><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search domains or registrars"/></label></div><div className="table-scroll"><table className="domain-table"><thead><tr><th>Domain</th><th>Registrar</th><th>Account</th><th>DNS provider</th><th>DNS status</th><th>Renewal date</th><th/></tr></thead><tbody>{visible.map((d) => <tr key={d.id}><td className="domain-cell">{d.hostname}</td><td>{d.registrar || <span className="muted-value">Not added</span>}</td><td>{d.registrarAccount || <span className="muted-value">—</span>}</td><td>{d.dnsProvider || <span className="muted-value">—</span>}</td><td><span className={`status-pill ${d.dnsStatus === "active" ? "active" : d.dnsStatus === "attention" ? "sold" : "draft"}`}>{d.dnsStatus}</span></td><td>{d.renewsOn || <span className="muted-value">—</span>}</td><td><button className="icon-button" onClick={() => openEditor(d)} aria-label={`Edit ${d.hostname}`}><SlidersHorizontal size={15}/></button></td></tr>)}</tbody></table></div></section>}
        {section === "Site pages" && <section className="content-card"><div className="card-heading"><div><h2>Pages on your domains <span className="count-chip">{pages.length}</span></h2><p>Create extra pages such as About, FAQ or Contact under each domain.</p></div><Button className="quiet-button" variant="outline" onClick={() => openPageEditor()}><Plus size={15}/> Add page</Button></div><div className="table-scroll"><table className="domain-table"><thead><tr><th>Domain</th><th>Page title</th><th>Path</th><th>Status</th><th/></tr></thead><tbody>{pages.map((page) => <tr key={page.id}><td className="domain-cell">{page.hostname}</td><td>{page.title}</td><td>/{page.slug}</td><td><span className={`status-pill ${page.published ? "active" : "draft"}`}>{page.published ? "Published" : "Draft"}</span></td><td className="row-actions"><Link className="icon-button" href={demoMode ? `/${page.slug}?domain=${encodeURIComponent(page.hostname)}` : `https://${page.hostname}/${page.slug}`} title="Preview page" aria-label={`Preview ${page.title}`}><ExternalLink size={15}/></Link><button className="icon-button" onClick={() => openPageEditor(page)} aria-label={`Edit ${page.title}`}><SlidersHorizontal size={15}/></button><button className="icon-button danger-icon" onClick={() => removePage(page)} aria-label={`Delete ${page.title}`}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{pages.length === 0 && <div className="empty-note table-empty">No extra pages yet. Add one to publish more information on a domain.</div>}</div><div className="page-section-note"><Globe2 size={15}/> The same deployment serves each page on its matching domain hostname.</div></section>}
        {section === "Website template" && <TemplateSettingsForm settings={siteSettings} pending={pending} onSubmit={submitTemplateSettings}/>}
        {section === "Settings" && <section className="content-card settings-card"><div className="card-heading"><div><h2>Platform settings</h2><p>Configure shared site and sale defaults.</p></div></div><div className="setting-row"><span><strong>Database connection</strong><small>Supabase project and migrations</small></span><span className={demoMode ? "status-pill setup" : "status-pill live"}>{demoMode ? "Needs setup" : backend === "server" ? "Saved on this server" : "Connected"}</span></div><div className="setting-row"><span><strong>Admin access</strong><small>Invite users by adding them to the admin allowlist.</small></span><span className="status-pill">Allowlist</span></div><div className="setting-row"><span><strong>Hosting</strong><small>One Vercel project can serve multiple custom domains.</small></span><Link className="text-button" href="/setup">Setup guide <ArrowUpRight size={15}/></Link></div><Link className="primary-button inline-button" href="/setup">Open setup checklist <ArrowUpRight size={15}/></Link></section>}
      </main>
      {editing && <DomainEditor record={editing} pending={pending} demoMode={demoMode} notice={notice} onClose={() => setEditing(null)} onSubmit={submitDomain}/>}
      {editingPage && <PageEditor record={editingPage} domains={domains} pending={pending} notice={notice} onClose={() => setEditingPage(null)} onSubmit={submitPage}/>}
    </div>
  );
}

function Metric({ label, value, note, icon }: { label: string; value: number; note: string; icon: React.ReactNode }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function TemplateSettingsForm({ settings, pending, onSubmit }: { settings: SiteSettings; pending: boolean; onSubmit: (form: FormData) => void }) {
  return <section className="content-card template-settings-card">
    <div className="card-heading"><div><h2>Shared domain website</h2><p>One responsive sale-page template appears on every active domain. Each domain keeps its own name, price, description, and included domains.</p></div></div>
    <form action={onSubmit} className="template-settings-form">
      <div className="template-settings-intro"><LayoutTemplate size={19}/><span><strong>Premium sale page</strong><small>Applied to every domain hostname, including www addresses.</small></span></div>
      <div className="template-settings-section"><h3>Page text</h3><div className="form-grid"><Field label="Availability label" name="availabilityLabel" defaultValue={settings.availabilityLabel}/><Field label="Price on request label" name="priceOnRequestLabel" defaultValue={settings.priceOnRequestLabel}/><Field label="Asking price label" name="askingPriceLabel" defaultValue={settings.askingPriceLabel}/><Field label="Included domains prefix" name="includedLabel" defaultValue={settings.includedLabel}/><Field label="Main button" name="buttonLabel" defaultValue={settings.buttonLabel}/><Field label="Contact link" name="contactLabel" defaultValue={settings.contactLabel}/><Field label="Portfolio link" name="portfolioLabel" defaultValue={settings.portfolioLabel}/><Field label="Contact email" name="contactEmail" type="email" defaultValue={settings.contactEmail} required/></div></div>
      <div className="template-settings-section"><h3>Transfer details</h3><div className="form-grid"><Field label="First row label" name="transferLabel" defaultValue={settings.transferLabel}/><Field label="First row text" name="transferValue" defaultValue={settings.transferValue}/><Field label="Second row label" name="paymentLabel" defaultValue={settings.paymentLabel}/><Field label="Second row text" name="paymentValue" defaultValue={settings.paymentValue}/><Field label="Third row label" name="ownershipLabel" defaultValue={settings.ownershipLabel}/><Field label="Third row text" name="ownershipValue" defaultValue={settings.ownershipValue}/></div></div>
      <div className="template-settings-footer"><span>Changes apply to all domain sites using this template.</span><Button type="submit" className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save website template"}</Button></div>
    </form>
  </section>;
}

function DomainTable({ records, demoMode, onEdit, onDelete }: { records: DomainRecord[]; demoMode: boolean; onEdit: (record: DomainRecord) => void; onDelete: (record: DomainRecord) => void }) {
  return <div className="table-scroll"><table className="domain-table"><thead><tr><th>Domain name</th><th>Category</th><th>Price</th><th>Status</th><th>Registrar</th><th/></tr></thead><tbody>{records.map((d) => <tr key={d.id}><td className="domain-cell"><span className="favicon-preview">{d.faviconUrl ? <Image src={d.faviconUrl} alt="" width={14} height={14} unoptimized/> : <Globe2 size={14}/>}</span>{d.hostname}</td><td>{d.category}</td><td>{money(d)}</td><td><span className={`status-pill ${d.status}`}>{d.status}</span></td><td>{d.registrar || <span className="muted-value">Not added</span>}</td><td className="row-actions"><button className="icon-button" aria-label={`Edit ${d.hostname}`} onClick={() => onEdit(d)}><SlidersHorizontal size={15}/></button><button className="icon-button danger-icon" aria-label={`Delete ${d.hostname}`} title={demoMode ? "Remove from local demo" : "Delete"} onClick={() => onDelete(d)}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{records.length === 0 && <div className="empty-note table-empty">No domains match this search.</div>}</div>;
}

function DomainEditor({ record, pending, demoMode, notice, onClose, onSubmit }: { record: DomainRecord; pending: boolean; demoMode: boolean; notice: string; onClose: () => void; onSubmit: (form: FormData) => void; }) {
  const [mode, setMode] = useState(record.includedMode);
  const [faviconUrl, setFaviconUrl] = useState(record.faviconUrl);
  const [faviconMessage, setFaviconMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const editing = Boolean(record.id);
  async function handleFavicon(file?: File, form?: HTMLFormElement | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) { setFaviconMessage("Choose a file under 1 MB."); return; }
    setUploading(true); setFaviconMessage("");
    const hostname = String(form ? new FormData(form).get("hostname") ?? "" : record.hostname).trim() || record.hostname;
    if (demoMode) {
      if (!file.type.startsWith("image/")) { setFaviconMessage("Choose an image file."); setUploading(false); return; }
      const reader = new FileReader();
      reader.onload = () => { const value = String(reader.result); setFaviconUrl(value); setFaviconMessage("Preview ready. It will save with this browser’s demo data."); setUploading(false); };
      reader.onerror = () => { setFaviconMessage("Could not read that image."); setUploading(false); };
      reader.readAsDataURL(file); return;
    }
    const upload = new FormData(); upload.set("hostname", hostname); upload.set("file", file);
    const result = await uploadFavicon(upload);
    if (result.error) setFaviconMessage(result.error); else { setFaviconUrl(result.url ?? ""); setFaviconMessage("Uploaded and ready to save."); }
    setUploading(false);
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="editor-panel" role="dialog" aria-modal="true" aria-labelledby="editor-title"><header className="editor-header"><div><span className="eyebrow-label">DOMAIN SETTINGS</span><h2 id="editor-title">{editing ? `Edit ${record.hostname}` : "Add a domain"}</h2></div><button className="icon-button close-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header>
    <form action={onSubmit} className="domain-form"><input type="hidden" name="id" value={record.id}/><div className="form-scroll"><div className="form-section"><h3>Public page</h3><p>Content shown on the domain’s own website and in your portfolio.</p><div className="form-grid"><Field label="Domain name" name="hostname" placeholder="example.si" defaultValue={record.hostname} required/><Field label="Page title" name="title" placeholder="A short name or headline" defaultValue={record.title}/><Field label="Category" name="category" defaultValue={record.category}/><label className="field"><span>Status</span><select name="status" defaultValue={record.status}><option value="active">Active</option><option value="draft">Draft</option><option value="sold">Sold</option></select></label><label className="field full-field"><span>Page description</span><textarea name="description" rows={3} defaultValue={record.description}/></label></div></div>
    <div className="form-section"><h3>Pricing & included domains</h3><p>The amount you enter is the price shown now. Each domain has its own rise timer, starting when that price is saved. Leave registrar and dates blank to fill them from the public registry when they are available.</p><div className="form-grid"><label className="field"><span>Price type</span><select name="priceType" defaultValue={record.priceType}><option value="request">Rising price</option><option value="fixed">Fixed price</option><option value="percentage">Percentage</option></select></label><Field label="Starting amount" name="price" type="number" step="0.01" placeholder="Blank uses 1,000,000" defaultValue={record.price ?? ""}/><Field label="Daily rise %" name="priceRisePercent" type="number" step="0.01" placeholder="7" defaultValue={record.priceRisePercent ?? 7}/><label className="field"><span>Currency</span><select name="currency" defaultValue={record.currency || "EUR"}><option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option></select></label><label className="field"><span>Included domains setting</span><select name="includedMode" value={mode} onChange={(event) => setMode(event.target.value as DomainRecord["includedMode"])}><option value="domains">Other domains included</option><option value="text">Custom included text</option><option value="none">Nothing included</option></select></label>{mode === "domains" && <label className="field full-field"><span>Included domain names</span><textarea name="includedDomains" rows={2} defaultValue={record.includedDomains.join("\n")} placeholder="One domain per line"/></label>}{mode === "text" && <label className="field full-field"><span>Included text</span><textarea name="includedText" rows={2} defaultValue={record.includedText} placeholder="Describe what is included"/></label>}</div></div>
    <div className="form-section"><h3>Registrar & DNS</h3><p>Private records for your own operational overview.</p><div className="form-grid"><Field label="Registrar" name="registrar" placeholder="e.g. Namecheap" defaultValue={record.registrar}/><Field label="Registrar account" name="registrarAccount" placeholder="Account label or email" defaultValue={record.registrarAccount}/><Field label="Registration date" name="registeredOn" type="date" defaultValue={record.registeredOn}/><Field label="Renewal date" name="renewsOn" type="date" defaultValue={record.renewsOn}/><Field label="DNS provider" name="dnsProvider" placeholder="e.g. Cloudflare" defaultValue={record.dnsProvider}/><label className="field"><span>DNS status</span><select name="dnsStatus" defaultValue={record.dnsStatus}><option value="unknown">Unknown</option><option value="pending">Pending setup</option><option value="active">Active</option><option value="attention">Needs attention</option></select></label><label className="field full-field"><span>Nameservers</span><textarea name="nameservers" rows={2} defaultValue={record.nameservers} placeholder="One nameserver per line"/></label><label className="field full-field"><span>Private notes</span><textarea name="internalNotes" rows={3} defaultValue={record.internalNotes} placeholder="Renewal reminders, account notes or internal details"/></label></div></div>
    <div className="form-section"><h3>Favicon</h3><p>Upload an ICO, PNG, SVG, JPEG or WebP icon, or paste a URL.</p><label className="upload-control"><Upload size={16}/><span>{uploading ? "Uploading…" : "Choose favicon file"}</span><input type="file" accept=".ico,.png,.svg,.jpg,.jpeg,.webp,image/x-icon,image/png,image/svg+xml,image/webp" onChange={(event) => void handleFavicon(event.target.files?.[0], event.currentTarget.form)} disabled={uploading}/></label>{faviconMessage && <span className="upload-message" role="status">{faviconMessage}</span>}<label className="field"><span>Favicon URL</span><input name="faviconUrl" value={faviconUrl} onChange={(event) => setFaviconUrl(event.target.value)} placeholder="https://... or /icons/domain.svg"/></label></div>
    {notice && <div className="notice form-notice" role="status">{notice}</div>}</div><footer className="editor-footer"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><Button type="submit" className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save domain"}</Button></footer></form>
  </section></div>;
}

function Field({ label, name, defaultValue, placeholder, type = "text", step, required }: { label: string; name: string; defaultValue?: string | number; placeholder?: string; type?: string; step?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} step={step} defaultValue={defaultValue} placeholder={placeholder} required={required}/></label>;
}

function PageEditor({ record, domains, pending, notice, onClose, onSubmit }: { record: DomainPageRecord; domains: DomainRecord[]; pending: boolean; notice: string; onClose: () => void; onSubmit: (form: FormData) => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="editor-panel page-editor" role="dialog" aria-modal="true" aria-labelledby="page-editor-title"><header className="editor-header"><div><span className="eyebrow-label">SITE PAGE</span><h2 id="page-editor-title">{record.id ? `Edit ${record.title}` : "Add a page"}</h2></div><button type="button" className="icon-button close-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header><form action={onSubmit} className="domain-form"><input type="hidden" name="id" value={record.id}/><div className="form-scroll"><div className="form-section"><p>Choose which domain owns this page. Its URL stays on that domain.</p><div className="form-grid"><label className="field full-field"><span>Domain name</span><select name="hostname" defaultValue={record.hostname} required>{domains.map((domain) => <option key={domain.id} value={domain.hostname}>{domain.hostname}</option>)}</select></label><Field label="Page path" name="slug" placeholder="about" defaultValue={record.slug} required/><Field label="Page title" name="title" placeholder="About us" defaultValue={record.title} required/><label className="field full-field"><span>Page content</span><textarea name="content" rows={12} defaultValue={record.content} placeholder="Write this page’s content. Line breaks are preserved."/></label><input type="hidden" name="published" value="false"/><label className="publish-field"><input type="checkbox" name="published" value="true" defaultChecked={record.published}/><span>Publish this page now</span></label></div></div>{notice && <div className="notice form-notice" role="status">{notice}</div>}<div className="page-url-preview">Page URL <strong>{record.hostname || "your-domain.com"}/{record.slug || "page-name"}</strong></div></div><footer className="editor-footer"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><Button type="submit" className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save page"}</Button></footer></form></section></div>;
}
