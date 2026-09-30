import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const yanone = localFont({
  src: "./fonts/YanoneKaffeesatz-Regular.ttf",
  weight: "200 700",
  style: "normal",
  display: "swap",
  variable: "--font-yanone",
  fallback: ["-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Assistente SAFEpass",
  description: "Assistente inteligente do clube de benefícios SAFEpass.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={yanone.variable}>
      <body>{children}</body>
    </html>
  );
}
