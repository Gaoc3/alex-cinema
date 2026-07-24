import React, { Suspense } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SidebarToggle from "@/components/SidebarToggle";
import SecurityWrapper from "@/components/SecurityWrapper";
import AILayoutEngine from "@/components/AILayoutEngine";
import CinematicLogo from "@/components/CinematicLogo";
import UserNav from "@/components/UserNav";
import Script from "next/script";
import { Toaster } from 'react-hot-toast';
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalSidebar from "@/components/ConditionalSidebar";
import ClientMainWrapper from "@/components/ClientMainWrapper";
import ConditionalFooter from "@/components/ConditionalFooter";
import TelegramAutoAuth from "@/components/auth/TelegramAutoAuth";
import { UnifiedAuthProvider } from "@/components/auth/UnifiedAuthProvider";

import { ClerkProvider } from '@clerk/nextjs'
import { arSA } from '@clerk/localizations'
import { dark } from '@clerk/themes'

export const metadata: Metadata = {
  title: "ALEX CINEMA | اليكس سينما",
  description: "المنصة الأولى لمشاهدة الأفلام والمسلسلات بجودة عالية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
      localization={arSA}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
        variables: {
          colorPrimary: '#e50914',
          colorBackground: '#0b0f19',
          colorText: '#ffffff',
          colorTextSecondary: '#e5e7eb',
          fontFamily: 'Cairo, sans-serif',
          borderRadius: '1rem',
        },
        elements: {
          footer: '!hidden',
          footerAction: '!hidden',
          devRow: '!hidden',
          watermark: '!hidden',
          userButtonPopoverFooter: '!hidden',
        }
      }}
    >
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>

      <body className="antialiased min-h-screen font-sans bg-black" suppressHydrationWarning>
        <UnifiedAuthProvider>
          <TelegramAutoAuth />
          <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' } }} />
          <AILayoutEngine />
          <SecurityWrapper>

          <div className="relative overflow-x-clip w-full min-h-screen flex flex-col z-10">
            <ConditionalSidebar />
            <ConditionalNavbar />

            {/* Main Content */}
            <ClientMainWrapper>
              {children}
            </ClientMainWrapper>

            {/* Footer */}
            <ConditionalFooter />
          </div>
          
          </SecurityWrapper>
        </UnifiedAuthProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
