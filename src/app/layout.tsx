import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pointeuse — Mon Suivi de Temps",
  description: "Application de pointage mobile-first pour suivre vos heures de stage",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#030712",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased bg-slate-950 text-white min-h-screen">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
