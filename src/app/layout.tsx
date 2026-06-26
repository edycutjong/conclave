import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Conclave — agentic governance that reads the contract before it signs",
  description:
    "A council of AI agents debates every DAO proposal, grounds it in live Casper state, collects council approvals off-chain, and — after a human veto window — executes the approved transaction on Casper Testnet. Part of the Vouch suite.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Conclave — agentic governance that reads the contract before it signs",
    description: "A council of AI agents debates every DAO proposal, grounds it in live Casper state, collects council approvals off-chain, and — after a human veto window — executes the approved transaction on Casper Testnet. Part of the Vouch suite.",
    url: "https://conclave.edycu.dev",
    siteName: "Conclave",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Conclave",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conclave — agentic governance that reads the contract before it signs",
    description: "A council of AI agents debates every DAO proposal, grounds it in live Casper state, collects council approvals off-chain, and — after a human veto window — executes the approved transaction on Casper Testnet. Part of the Vouch suite.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
