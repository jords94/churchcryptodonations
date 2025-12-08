import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";

/**
 * Load Inter font from Google Fonts
 * Inter is a clean, modern sans-serif font ideal for web applications
 */
const inter = Inter({ subsets: ["latin"] });

/**
 * Metadata configuration for SEO and social sharing
 * These values appear in browser tabs, search results, and social media previews
 */
export const metadata: Metadata = {
  title: "Church Crypto Donations - Accept Bitcoin & USDC",
  description: "Secure platform enabling churches to receive crypto donations from congregation members. Accept BTC and USDC with easy-to-use wallets and QR codes.",
  keywords: ["church donations", "crypto donations", "bitcoin church", "usdc donations", "cryptocurrency giving"],
  authors: [{ name: "Church Crypto Donations" }],
  openGraph: {
    title: "Church Crypto Donations",
    description: "Accept crypto donations for your church with ease",
    type: "website",
  },
};

/**
 * Root layout component
 *
 * This component wraps all pages in the application and provides:
 * - Global styles and fonts
 * - HTML structure with proper lang attribute for accessibility
 * - Client providers: Authentication, church context
 *
 * @param children - Child components (pages) to render
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
