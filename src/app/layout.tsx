import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import SidebarToggle from "@/components/SidebarToggle";
import SecurityWrapper from "@/components/SecurityWrapper";
import Script from "next/script";

const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });



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
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className="antialiased min-h-screen font-sans bg-black" suppressHydrationWarning>
        <SecurityWrapper>
        
        {/* Liquid Glass Animated Background */}
        <div className="liquid-bg"></div>

        <div className="relative overflow-x-clip w-full min-h-screen flex flex-col z-10">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>        {/* Navbar */}
        <nav className="absolute w-full max-w-[100vw] z-40 transition-all duration-300 pointer-events-none pt-2 sm:pt-4" id="navbar">
          <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-8">
              <div className="flex items-center justify-between gap-3 h-14 sm:h-16 lg:h-20 pointer-events-auto px-4 sm:px-6">
                  {/* Logo - shown on mobile only */}
                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 lg:hidden">
                      {/* Mobile Hamburger Menu (Right side in RTL) */}
                      <div className="flex shrink-0">
                        <SidebarToggle />
                      </div>
                      
                      <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group hover-scale">
                          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_20px_rgba(229,9,20,0.8)] transition-all duration-300 border border-white/10">
                              <img src="/logo.svg" alt="AleX Cinema Logo" className="w-full h-full object-cover scale-[1.05]" />
                          </div>
                          <div className="flex flex-col leading-none mt-0.5">
                              <span className="text-sm sm:text-2xl font-black font-en tracking-wider text-white drop-shadow-md">ALEX<span className="text-alex-primary">CINEMA</span></span>
                              <span className="hidden sm:block text-[10px] text-gray-400 font-bold tracking-[0.15em] mt-1 uppercase opacity-80">Premium Platform</span>
                          </div>
                      </Link>
                  </div>

                  {/* Desktop spacer to push search bar to left since logo is hidden on desktop */}
                  <div className="hidden lg:block flex-1 pointer-events-none"></div>
 
                  <div className="flex items-center shrink-0">
                      <Suspense fallback={<div className="w-8 h-8 rounded-full bg-white/5 animate-pulse"></div>}>
                          <SearchBar />
                      </Suspense>
                  </div>
              </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow lg:pr-72 pt-16 sm:pt-20 lg:pt-0">
          {children}
        </main>

        {/* Footer */}
        <footer className="pt-16 pb-10 mt-auto relative z-10 lg:pr-72">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    <div className="flex items-center gap-4">
                        <a href="#" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-gray-400 hover:text-white hover:bg-alex-primary transition-all hover-scale"><i className="fa-brands fa-twitter"></i></a>
                        <a href="#" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-gray-400 hover:text-white hover:bg-alex-primary transition-all hover-scale"><i className="fa-brands fa-instagram"></i></a>
                        <a href="#" className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-gray-400 hover:text-white hover:bg-alex-primary transition-all hover-scale"><i className="fa-brands fa-telegram"></i></a>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">
                        جميع الحقوق محفوظة &copy; 2026 <span className="font-en text-gray-300 font-bold">ALEX CINEMA</span>
                    </p>
                </div>
            </div>
        </footer>
        </div>
        </SecurityWrapper>
      </body>
    </html>
  );
}
