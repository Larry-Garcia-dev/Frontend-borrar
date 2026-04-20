import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Macondo AI - Generador de Imagenes con IA",
  description:
    "Crea imagenes increibles con inteligencia artificial. Genera arte unico con nuestra plataforma de IA avanzada.",
  keywords: ["AI", "generador de imagenes", "inteligencia artificial", "arte"],
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} bg-background`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
