import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InstaView — See who started following any Instagram account",
  description:
    "Track new followers of any Instagram profile over time. Snapshot-based detection of who started following, growth history, and alerts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
