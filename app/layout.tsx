import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

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
      <body className="min-h-screen font-sans antialiased">
        <ConfirmProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-right" richColors closeButton />
        </ConfirmProvider>
      </body>
    </html>
  );
}
