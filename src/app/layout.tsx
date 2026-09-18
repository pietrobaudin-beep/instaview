import type { Metadata } from "next";
import { Caveat, Space_Grotesk } from "next/font/google";
import "./globals.css";

// The brand board specifies a grotesk; Space Grotesk carries the same tight,
// heavy feel as the Farejo wordmark.
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-grotesk",
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
    <html lang="pt-BR" className={`${grotesk.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
