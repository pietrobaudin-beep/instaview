import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farejo — Veja quem essa pessoa começou a seguir no Instagram",
  description:
    "Digite um @username e acompanhe novos seguindo, interações recentes e mudanças no perfil ao longo do tempo. Apenas dados públicos, sem senha do Instagram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
