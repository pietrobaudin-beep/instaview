import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, Inter } from "next/font/google";
import "./globals.css";

// Titles and subtitles, per the brand board: Bricolage Grotesque, in the
// heavy weights. It carries the same tight, built feel as the Farejo wordmark.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Everything you read and click: Inter, regular to semibold.
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-ui",
  display: "swap",
});

// Handwritten accent used for the brand annotations ("toda curiosidade deixa um rastro").
const hand = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Farejo — Fareje além do @",
  description:
    "Curiosidade conecta. Descubra conexões, acompanhe mudanças e encontre pistas a partir de um @ — apenas informações públicas, sem senha do Instagram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
