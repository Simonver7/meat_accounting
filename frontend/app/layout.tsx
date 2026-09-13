import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Учёт мяса",
  description: "Внутренний учёт мяса точки",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#121212",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
