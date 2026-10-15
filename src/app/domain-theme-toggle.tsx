"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DomainThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const useDark = localStorage.getItem("domain-site-theme") === "dark";
      document.documentElement.dataset.theme = useDark ? "dark" : "light";
      setDark(useDark);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggle() {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("domain-site-theme", next ? "dark" : "light");
    setDark(next);
  }

  return <button type="button" className="domain-theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} mode`}>
    {dark ? <Sun size={14}/> : <Moon size={14}/>} {dark ? "LIGHT" : "DARK"}
  </button>;
}
