"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./approved-template.css";
import templateMarkup from "./approved-template-markup.json";
import { imetRiseStartedAt, type DomainRecord } from "@/lib/domains";
import { defaultSiteSettings, type SiteSettings } from "@/lib/site-settings";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function ApprovedDomainTemplate({ initialDomain, settings = defaultSiteSettings }: { initialDomain: DomainRecord; settings?: SiteSettings }) {
  const [domain, setDomain] = useState(initialDomain);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const container = useRef<HTMLDivElement>(null);
  const markup = useMemo(() => {
    const [name, ...suffixParts] = domain.hostname.split(".");
    const suffix = suffixParts.length ? `.${suffixParts.join(".")}` : "";
    const hostMarkup = `${escapeHtml(name)}<span class="domain-suffix">${escapeHtml(suffix)}</span>`;
    const included = domain.includedMode === "domains"
      ? domain.includedDomains.map((item) => {
        const [bundleName, ...bundleSuffix] = item.split(".");
        return `${escapeHtml(bundleName)}<span class="domain-suffix">${escapeHtml(bundleSuffix.length ? `.${bundleSuffix.join(".")}` : "")}</span>`;
      }).join(", ")
      : domain.includedMode === "text" ? escapeHtml(domain.includedText) : "";
    const bundle = domain.includedMode === "none" ? "" : `${escapeHtml(settings.includedLabel)} <b>${included}</b>`;
    const encodedMessage = encodeURIComponent(`Hello, I'm interested in ${domain.hostname}. Could you share more details?`);
    const emailSubject = encodeURIComponent(`Inquiry about ${domain.hostname}`);
    const emailBody = encodeURIComponent(`Hello, I'm interested in ${domain.hostname}. Could you share more details?`);
    return templateMarkup
      .replace("{{HOST_MARKUP}}", hostMarkup)
      .replace("{{BUNDLE_MARKUP}}", included)
      .replace("{{HOST_TEXT}}", escapeHtml(domain.hostname))
      .replace(/<p class='bundle'>[\s\S]*?<\/p>/, bundle ? `<p class='bundle'>${bundle}</p>` : "<p class='bundle empty' aria-hidden='true'></p>")
      .replace(/https:\/\/wa\.me\/32498659663\?text=[^']+/, `https://wa.me/32498659663?text=${encodedMessage}`)
      .replace(/mailto:[^'"]+\?subject=[^']+/, `mailto:${settings.contactEmail}?subject=${emailSubject}&body=${emailBody}`)
      .replace("id='viewerNumber'>3<", `id='viewerNumber'>${domain.viewerCount ?? 0}<`);
  }, [domain, settings]);

  useEffect(() => { setDomain(initialDomain); }, [initialDomain]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("imet-theme"); } catch { /* Storage can be disabled by the browser. */ }
    const frame = window.requestAnimationFrame(() => setTheme(saved === "dark" ? "dark" : "light"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    root.dataset.theme = theme;
    const toggle = root.querySelector<HTMLButtonElement>("#themeToggle");
    const content = root.querySelector<HTMLElement>(".content");
    const domainHeading = content?.querySelector<HTMLElement>(".dom");
    const portfolioFrame = root.querySelector<HTMLIFrameElement>(".portfolio-frame");
    const portfolioModal = root.querySelector<HTMLDialogElement>("#portfolioModal");
    const syncPortfolioTheme = (activeTheme: "light" | "dark" = root.dataset.theme === "dark" ? "dark" : "light") => portfolioFrame?.contentWindow?.postMessage({ type: "imet-theme", theme: activeTheme }, "*");
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
    syncThemeControl(theme);
    const toggleTheme = () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      setTheme(next);
      syncThemeControl(next);
      try { localStorage.setItem("imet-theme", next); } catch { /* Storage can be disabled by the browser. */ }
      syncPortfolioTheme(next);
    };
    const fit = () => {
      if (!content) return;
      const parts = content.querySelectorAll<HTMLElement>(".col,.card,.details");
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
      if (fits(1)) return;
      let low = 0.25;
      let high = 1;
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
    toggle?.addEventListener("click", toggleTheme);
    portfolioFrame?.addEventListener("load", onPortfolioFrameLoad);
    portfolioOpen?.addEventListener("click", onPortfolioOpen);
    portfolioClose?.addEventListener("click", onPortfolioClose);
    portfolioModal?.addEventListener("click", onModalClick);
    contactToggle?.addEventListener("click", onContactToggle);
    const viewerNumber = root.querySelector("#viewerNumber");
    const observer = viewerNumber ? new MutationObserver(onViewerChange) : null;
    if (viewerNumber && observer) observer.observe(viewerNumber, { childList: true, characterData: true, subtree: true });
    onViewerChange();
    const day = 86400000;
    const formatPrice = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;
    const twoDigits = (value: number) => `${value < 10 ? "0" : ""}${value}`;
    const tick = () => {
      const now = Date.now();
      const start = Date.parse(root.dataset.riseStart || "");
      const firstRise = Number.isFinite(start) ? start : now;
      const legacy = root.dataset.riseLegacy === "true";
      const periods = now < firstRise ? 0 : Math.floor((now - firstRise) / day);
      const rises = legacy ? (now < firstRise ? 0 : periods + 1) : periods;
      const remaining = Math.max(0, Math.floor((firstRise + (periods + 1) * day - now) / 1000));
      const viewerNumber = root.querySelector("#viewerNumber");
      const viewers = Number(root.dataset.viewers);
      if (viewerNumber && Number.isFinite(viewers)) viewerNumber.textContent = String(Math.max(0, Math.round(viewers)));
      const configuredPrice = Number(root.dataset.price);
      const hasAmount = root.dataset.price !== "" && Number.isFinite(configuredPrice) && configuredPrice >= 0;
      const risePercent = Number(root.dataset.rise);
      const riseRate = Number.isFinite(risePercent) ? risePercent / 100 : 0.07;
      const percentage = hasAmount && root.dataset.priceType === "percentage";
      const basePrice = hasAmount ? configuredPrice : 1_000_000;
      const price = basePrice * Math.pow(1 + riseRate, rises);
      const formatDomainPrice = (amount: number) => percentage
        ? `${Number(amount.toFixed(2))}%`
        : hasAmount
          ? new Intl.NumberFormat("en", { style: "currency", currency: root.dataset.currency || "EUR", maximumFractionDigits: 0 }).format(amount)
          : formatPrice(amount);
      const timer = root.querySelector<HTMLElement>("#timer3");
      const current = root.querySelector<HTMLElement>("#livePrice");
      const previous = root.querySelector<HTMLElement>("#prevP");
      const nextPrice = root.querySelector<HTMLElement>("#nextPrice");
      const riseNote = root.querySelector<HTMLElement>("#riseNote");
      const rising = riseRate > 0;
      if (nextPrice) nextPrice.style.visibility = rising ? "visible" : "hidden";
      if (riseNote) riseNote.textContent = rising ? `Price rises ${Number((riseRate * 100).toFixed(2))}% in` : "Price held";
      if (timer) {
        timer.style.visibility = rising ? "visible" : "hidden";
        timer.textContent = `${twoDigits(Math.floor(remaining / 3600))}h ${twoDigits(Math.floor(remaining % 3600 / 60))}m ${twoDigits(remaining % 60)}s`;
      }
      if (current) current.textContent = formatDomainPrice(price);
      if (previous) previous.textContent = formatDomainPrice(price * (1 + riseRate));
    };
    const priceTimer = root.querySelector("#timer3") ? window.setInterval(tick, 1000) : undefined;
    if (root.querySelector("#timer3")) tick();
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit);
    fit();
    return () => {
      toggle?.removeEventListener("click", toggleTheme);
      portfolioFrame?.removeEventListener("load", onPortfolioFrameLoad);
      portfolioOpen?.removeEventListener("click", onPortfolioOpen);
      portfolioClose?.removeEventListener("click", onPortfolioClose);
      portfolioModal?.removeEventListener("click", onModalClick);
      contactToggle?.removeEventListener("click", onContactToggle);
      observer?.disconnect();
      if (priceTimer) window.clearInterval(priceTimer);
      window.removeEventListener("resize", fit);
    };
  }, [markup, theme]);

  return <div ref={container} className="approved-template" data-theme={theme} data-price-type={domain.priceType} data-price={domain.price ?? ""} data-rise={domain.priceRisePercent ?? 7} data-rise-start={domain.priceRiseStartedAt || ""} data-rise-legacy={domain.hostname === "imet.si" && domain.priceRiseStartedAt === imetRiseStartedAt ? "true" : "false"} data-viewers={domain.viewerCount ?? 0} data-currency={domain.currency} dangerouslySetInnerHTML={{ __html: markup }} />;
}
