import type { Metadata } from "next";
import { Readex_Pro, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";

const arabic = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic"
});

const numeric = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-numeric"
});

export const metadata: Metadata = {
  title: "Haebar Finance OS",
  description: "High-precision financial system with Next.js, Prisma, and PostgreSQL."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${numeric.variable}`}>
      <body className="font-[var(--font-arabic)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
