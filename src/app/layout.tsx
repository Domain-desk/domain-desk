import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", adjustFontFallback: true, variable: "--font-inter" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: "700", display: "swap", adjustFontFallback: true, variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: { default: "Domain Portfolio", template: "%s · Domain Portfolio" },
  description: "A collection of distinctive domain names, available for acquisition.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f6f8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${robotoMono.variable}`} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('imet-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} /></head>
    <body>{children}</body>
  </html>;
}
