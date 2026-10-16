"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DomainThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("imet-theme");
      const chosen = saved === "dark" || saved === "light" ? saved : null;
      const useDark = chosen ? chosen === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (chosen) document.documentElement.dataset.theme = chosen;
      else delete document.documentElement.dataset.theme;
      setDark(useDark);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("imet-theme", next ? "dark" : "light");
    setDark(next);
  }

  return <button type="button" className="domain-theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
    {dark ? <Sun size={14}/> : <Moon size={14}/>} {dark ? "LIGHT" : "DARK"}
  </button>;
}
