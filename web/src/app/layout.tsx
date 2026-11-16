import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PixSort — Every moment. Every face. Sorted.",
  description:
    "Share an event, upload photos, and let AI find every photo you appear in. No account needed.",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.svg", apple: "/logo.svg" },
  openGraph: {
    title: "PixSort",
    description: "AI-powered shared event photo albums",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PixSort",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        {/* Skip-to-content for keyboard / screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:font-semibold focus:text-white"
          style={{ background: '#FF6B4A' }}
        >
          Skip to content
        </a>

        <OfflineBanner />

        <ThemeProvider>
          <ToastProvider>
            <main id="main-content">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
