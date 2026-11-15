import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PixSort — AI-Powered Event Photo Sorting",
  description: "A shared event photo pool with automatic AI face sorting, giving every guest a personalized album of their moments.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-sunset-cream dark:bg-sunset-dark-bg text-sunset-text dark:text-sunset-dark-text antialiased selection:bg-sunset-rose selection:text-sunset-text">
        {children}
      </body>
    </html>
  );
}
