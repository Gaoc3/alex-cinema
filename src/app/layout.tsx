import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import SecurityWrapper from "@/components/SecurityWrapper";
import AILayoutEngine from "@/components/AILayoutEngine";
import Script from "next/script";
import { Toaster } from 'react-hot-toast';
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalSidebar from "@/components/ConditionalSidebar";
import ClientMainWrapper from "@/components/ClientMainWrapper";
import ConditionalFooter from "@/components/ConditionalFooter";
import TelegramAutoAuth from "@/components/auth/TelegramAutoAuth";
import { UnifiedAuthProvider } from "@/components/auth/UnifiedAuthProvider";
import ImageRecovery from "@/components/ImageRecovery";
import ScrollToTopButton from "@/components/ScrollToTopButton";

import { ClerkProvider } from '@clerk/nextjs'
import { arSA } from '@clerk/localizations'

export const metadata: Metadata = {
  title: "ALEX CINEMA | اليكس سينما",
  description: "المنصة الأولى لمشاهدة الأفلام والمسلسلات بجودة عالية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider 
      localization={{
        ...arSA,
        socialButtonsBlockButton: "الدخول عبر {{provider|titleize}}",
      }}
      afterSignOutUrl="/"
      appearance={{
        theme: 'simple',
        variables: {
          colorPrimary: '#e50914',
          colorPrimaryForeground: '#ffffff',
          colorBackground: '#0b0f19',
          colorForeground: '#ffffff',
          colorMuted: '#111827',
          colorMutedForeground: '#cbd5e1',
          colorInput: '#111827',
          colorInputForeground: '#ffffff',
          colorBorder: 'rgba(255, 255, 255, 0.15)',
          fontFamily: 'Cairo, sans-serif',
          borderRadius: '1rem',
        }
      }}
    >
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=window.location.hash||'';var s=window.location.search||'';var p=window.location.pathname;var isTg=(h.indexOf('tgWebAppData')!==-1)||(s.indexOf('tgWebApp')!==-1)||(s.indexOf('tgWebAppData')!==-1);if(isTg&&p!=='/tg-app'&&!p.startsWith('/watch')&&!p.startsWith('/room')){window.location.replace('/tg-app'+s+h);return;}document.documentElement.classList.add('preload');var sb=localStorage.getItem('sidebar-expanded');if(sb==='true'){document.documentElement.classList.add('sidebar-expanded');}else{document.documentElement.classList.add('sidebar-collapsed');}window.addEventListener('DOMContentLoaded',function(){setTimeout(function(){document.documentElement.classList.remove('preload');if(document.body){document.body.classList.remove('preload');if(sb==='true'){document.body.classList.add('sidebar-expanded');}else{document.body.classList.add('sidebar-collapsed');}}},100);});}catch(e){}})();`,
          }}
        />
      </head>

      <body className="antialiased min-h-screen font-sans bg-black preload sidebar-collapsed" suppressHydrationWarning>
        <UnifiedAuthProvider>
          <TelegramAutoAuth />
          <ImageRecovery />
          <Toaster 
            position="top-center" 
            reverseOrder={false}
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0d1222',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '16px',
                padding: '12px 20px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(229, 9, 20, 0.35)',
                fontSize: '14px',
                fontWeight: '700',
                fontFamily: 'Cairo, sans-serif',
                direction: 'rtl'
              },
              success: {
                iconTheme: {
                  primary: '#E50914',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              }
            }} 
          />
          <AILayoutEngine />
          <SecurityWrapper>

          <div className="relative overflow-x-hidden w-full min-h-screen flex flex-col z-10">
            <ConditionalSidebar />
            <ConditionalNavbar />

            {/* Main Content */}
            <ClientMainWrapper>
              {children}
            </ClientMainWrapper>

            {/* Footer */}
            <ConditionalFooter />
            <ScrollToTopButton />
          </div>
          
          </SecurityWrapper>
        </UnifiedAuthProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
