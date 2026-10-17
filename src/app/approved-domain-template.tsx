"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./approved-template.css";
import templateMarkup from "./approved-template-markup.json";
import { imetRiseStartedAt, saleQuote, type DomainRecord } from "@/lib/domains";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function ApprovedDomainTemplate({ initialDomain, settings = defaultSiteSettings, pricedAt }: { initialDomain: DomainRecord; settings?: SiteSettings; pricedAt: number }) {
  const [domain, setDomain] = useState(initialDomain);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const markup = useMemo(() => {
    const [name, ...suffixParts] = domain.hostname.split(".");
    const suffix = suffixParts.length ? `.${suffixParts.join(".")}` : "";
    const hostMarkup = `${escapeHtml(name)}<span class="domain-suffix">${escapeHtml(suffix)}</span>`;
    const includedNames = domain.includedMode === "domains"
      ? domain.includedDomains.map((item) => {
        const [bundleName, ...bundleSuffix] = item.split(".");
        return `${escapeHtml(bundleName)}<span class="domain-suffix">${escapeHtml(bundleSuffix.length ? `.${bundleSuffix.join(".")}` : "")}</span>`;
      }).join(", ")
      : "";
    const customText = domain.includedMode === "text" ? escapeHtml(domain.includedText.trim()) : "";
    const bundle = includedNames
      ? `${escapeHtml(settings.includedLabel)} <b>${includedNames}</b>`
      : customText;
    const quote = saleQuote(domain, pricedAt);
    const encodedMessage = encodeURIComponent(`Hello, I'm interested in ${domain.hostname}. Could you share more details?`);
    const emailSubject = encodeURIComponent(`Inquiry about ${domain.hostname}`);
    const emailBody = encodeURIComponent(`Hello, I'm interested in ${domain.hostname}. Could you share more details?`);
    return templateMarkup
      .replace("{{HOST_MARKUP}}", hostMarkup)
      .replace("{{BUNDLE_MARKUP}}", includedNames || customText)
      .replace("{{HOST_TEXT}}", escapeHtml(domain.hostname))
      .replace(/<p class='bundle'>[\s\S]*?<\/p>\s*<p class='desc'[\s\S]*?<\/p>/, bundle ? `<p class='bundle${customText ? " text-only" : ""}'>${bundle}</p>` : "<p class='bundle empty' aria-hidden='true'></p>")
      .replace("id='prevP'>$1,070,000<", `id='prevP'>${escapeHtml(quote.nextLabel)}<`)
      .replace("id='livePrice'>$1,000,000<", `id='livePrice'>${escapeHtml(quote.currentLabel)}<`)
      .replace("id='riseNote'>Price rises 7% in<", `id='riseNote'>${escapeHtml(quote.riseLabel)}<`)
      .replace("id='timer3' class='tbox'>00h 00m 00s<", `id='timer3' class='tbox'>${escapeHtml(quote.timer)}<`)
      .replace("<p class='was-p' id='nextPrice'>", `<p class='was-p' id='nextPrice'${quote.rising ? "" : " hidden"}>`)
      .replace("<span class='lbl nowlbl'>Now</span>", `<span class='lbl nowlbl'${quote.rising ? "" : " hidden"}>Now</span>`)
      .replace("<p class='price'>", `<p class='price${quote.request ? " is-request" : ""}'>`)
      .replace("<div class='row'><b id='riseNote'>", `<div class='row'${quote.rising ? "" : " hidden"}><b id='riseNote'>`)
      .replace(/https:\/\/wa\.me\/32498659663\?text=[^']+/, `https://wa.me/32498659663?text=${encodedMessage}`)
      .replace(/mailto:[^'"]+\?subject=[^']+/, `mailto:${settings.contactEmail}?subject=${emailSubject}&body=${emailBody}`)
      .replace("id='viewerNumber'>3<", `id='viewerNumber'>${domain.viewerCount ?? 0}<`);
  }, [domain, pricedAt, settings]);

  useEffect(() => { setDomain(initialDomain); }, [initialDomain]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("imet-theme"); } catch { /* Storage can be disabled by the browser. */ }
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    if (theme) {
      root.dataset.theme = theme;
      document.documentElement.dataset.theme = theme;
    }
    const systemTheme = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const activeTheme = (): "light" | "dark" => {
      const explicit = root.dataset.theme || document.documentElement.dataset.theme;
      return explicit === "dark" || explicit === "light" ? explicit : systemTheme();
    };
    const toggle = root.querySelector<HTMLButtonElement>("#themeToggle");
    const content = root.querySelector<HTMLElement>(".content");
    const domainHeading = content?.querySelector<HTMLElement>(".dom");
    const portfolioFrame = root.querySelector<HTMLIFrameElement>(".portfolio-frame");
    const portfolioModal = root.querySelector<HTMLDialogElement>("#portfolioModal");
    const syncPortfolioTheme = (shown: "light" | "dark" = activeTheme()) => portfolioFrame?.contentWindow?.postMessage({ type: "imet-theme", theme: shown }, "*");
    const syncThemeControl = (activeTheme: "light" | "dark") => {
      toggle?.setAttribute("aria-pressed", String(activeTheme === "dark"));
      toggle?.setAttribute("aria-label", `Switch to ${activeTheme === "dark" ? "light" : "dark"} theme`);
      const label = toggle?.querySelector("span");
      if (label) label.textContent = activeTheme === "dark" ? "Light" : "Dark";
      const icon = toggle?.querySelector("svg");
      if (icon) icon.innerHTML = activeTheme === "dark"
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l-1.42 1.42m11.3-11.3 1.42-1.42"/>'
        : '<path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/>';
    };
    syncThemeControl(activeTheme());
    const recordTheme = (eventName: "view" | "inquiry") => {
      const shown = activeTheme();
      const key = `domain-desk-theme-${eventName}-${domain.hostname}-${shown}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch { /* Storage can be disabled by the browser. */ }
      void fetch("/api/theme-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ hostname: domain.hostname, theme: shown, event: eventName }) }).catch(() => undefined);
    };
    recordTheme("view");
    const toggleTheme = () => {
      const next = activeTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      document.documentElement.dataset.theme = next;
      setTheme(next);
      syncThemeControl(next);
      try { localStorage.setItem("imet-theme", next); } catch { /* Storage can be disabled by the browser. */ }
      syncPortfolioTheme(next);
    };
    const fit = () => {
      if (!content) return;
      const parts = content.querySelectorAll<HTMLElement>(".col,.card,.details");
      content.style.removeProperty("--s");
      const startingScale = Number.parseFloat(getComputedStyle(content).getPropertyValue("--s"));
      const maxScale = Number.isFinite(startingScale) && startingScale > 0 ? Math.min(startingScale, 1) : 1;
      const fits = (scale: number) => {
        content.style.setProperty("--s", String(scale));
        if (domainHeading) {
          domainHeading.style.removeProperty("font-size");
          const availableWidth = domainHeading.parentElement?.clientWidth ?? 0;
          const naturalWidth = domainHeading.scrollWidth;
          const baseSize = Number.parseFloat(getComputedStyle(domainHeading).fontSize);
          if (availableWidth > 0 && naturalWidth > availableWidth && Number.isFinite(baseSize)) {
            domainHeading.style.fontSize = `${baseSize * availableWidth / naturalWidth}px`;
          }
        }
        return content.scrollHeight <= content.clientHeight + 1 && Array.from(parts).every((part) => part.scrollWidth <= part.clientWidth + 1);
      };
      if (fits(maxScale)) return;
      let low = 0.25;
      let high = maxScale;
      for (let index = 0; index < 14; index += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      fits(low);
    };
    const portfolioOpen = root.querySelector<HTMLAnchorElement>("#portfolioOpen");
    const portfolioClose = root.querySelector<HTMLButtonElement>("#portfolioClose");
    const contactToggle = root.querySelector<HTMLButtonElement>("#contactToggle");
    const contactOptions = root.querySelector<HTMLElement>("#contactOptions");
    const onPortfolioOpen = (event: Event) => {
      if (portfolioModal && typeof portfolioModal.showModal === "function") {
        event.preventDefault();
        portfolioModal.showModal();
        syncPortfolioTheme();
      }
    };
    const onPortfolioClose = () => portfolioModal?.close();
    const onPortfolioFrameLoad = () => syncPortfolioTheme();
    const onModalClick = (event: MouseEvent) => { if (event.target === portfolioModal) portfolioModal?.close(); };
    const onContactToggle = () => {
      if (!contactToggle || !contactOptions) return;
      contactToggle.classList.add("is-leaving");
      contactToggle.setAttribute("aria-expanded", "true");
      window.setTimeout(() => {
        contactToggle.hidden = true;
        contactOptions.hidden = false;
        contactOptions.classList.add("is-entering");
      }, 220);
    };
    const onViewerChange = () => {
      const dot = root.querySelector<HTMLElement>("#viewerDot");
      const count = Number(root.querySelector("#viewerNumber")?.textContent?.trim());
      if (dot) dot.hidden = !(Number.isFinite(count) && count > 0);
    };
    const onInquiry = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".btn, a[href^='mailto:'], a[href*='wa.me']")) recordTheme("inquiry");
    };
    toggle?.addEventListener("click", toggleTheme);
    root.addEventListener("click", onInquiry);
    portfolioFrame?.addEventListener("load", onPortfolioFrameLoad);
    portfolioOpen?.addEventListener("click", onPortfolioOpen);
    portfolioClose?.addEventListener("click", onPortfolioClose);
    portfolioModal?.addEventListener("click", onModalClick);
    contactToggle?.addEventListener("click", onContactToggle);
    const viewerNumber = root.querySelector("#viewerNumber");
    const observer = viewerNumber ? new MutationObserver(onViewerChange) : null;
    if (viewerNumber && observer) observer.observe(viewerNumber, { childList: true, characterData: true, subtree: true });
    onViewerChange();
    const writeText = (element: HTMLElement | null, value: string) => {
      if (element && element.textContent !== value) element.textContent = value;
    };
    const tick = () => {
      const quote = saleQuote(domain, Date.now());
      const viewer = root.querySelector("#viewerNumber");
      const viewers = Number(root.dataset.viewers);
      if (viewer && Number.isFinite(viewers)) writeText(viewer, String(Math.max(0, Math.round(viewers))));
      const timer = root.querySelector<HTMLElement>("#timer3");
      const current = root.querySelector<HTMLElement>("#livePrice");
      const previous = root.querySelector<HTMLElement>("#prevP");
      const nextPrice = root.querySelector<HTMLElement>("#nextPrice");
      const riseNote = root.querySelector<HTMLElement>("#riseNote");
      const priceLine = root.querySelector<HTMLElement>(".price");
      const nowLabel = root.querySelector<HTMLElement>(".nowlbl");
      if (nextPrice) nextPrice.hidden = !quote.rising;
      if (nowLabel) nowLabel.hidden = !quote.rising;
      if (priceLine) priceLine.classList.toggle("is-request", quote.request);
      if (riseNote) {
        writeText(riseNote, quote.riseLabel);
        if (riseNote.parentElement) riseNote.parentElement.hidden = !quote.rising;
      }
      if (timer && quote.rising) writeText(timer, quote.timer);
      writeText(current, quote.currentLabel);
      if (quote.nextLabel) writeText(previous, quote.nextLabel);
    };
    const layout = () => { fit(); };
    const priceTimer = root.querySelector("#timer3") ? window.setInterval(tick, 1000) : undefined;
    if (root.querySelector("#timer3")) tick();
    window.addEventListener("resize", layout);
    document.fonts?.ready.then(layout);
    layout();
    return () => {
      toggle?.removeEventListener("click", toggleTheme);
      root.removeEventListener("click", onInquiry);
      portfolioFrame?.removeEventListener("load", onPortfolioFrameLoad);
      portfolioOpen?.removeEventListener("click", onPortfolioOpen);
      portfolioClose?.removeEventListener("click", onPortfolioClose);
      portfolioModal?.removeEventListener("click", onModalClick);
      contactToggle?.removeEventListener("click", onContactToggle);
      observer?.disconnect();
      if (priceTimer) window.clearInterval(priceTimer);
      window.removeEventListener("resize", layout);
    };
  }, [domain.hostname, markup, theme]);

  const hasBundle = domain.includedMode === "domains" ? domain.includedDomains.length > 0 : domain.includedMode === "text" ? domain.includedText.trim().length > 0 : false;
  return <div ref={container} className="approved-template" data-domain-desk="sale" data-theme={theme ?? undefined} data-bundle={hasBundle ? "yes" : "no"} data-price-type={domain.priceType} data-price={domain.price ?? ""} data-rise={domain.price === null ? 0 : domain.priceRisePercent ?? 0} data-rise-start={domain.priceRiseStartedAt || ""} data-rise-legacy={domain.hostname === "imet.si" && domain.price !== null && domain.priceRiseStartedAt === imetRiseStartedAt ? "true" : "false"} data-viewers={domain.viewerCount ?? 0} data-currency={domain.currency} dangerouslySetInnerHTML={{ __html: markup }} />;
}
