import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import SidebarToggle from "@/components/SidebarToggle";
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
      <body className="antialiased min-h-screen font-sans" suppressHydrationWarning>
        <div className="relative overflow-x-hidden w-full min-h-screen flex flex-col">        {/* Sidebar */}
        <Sidebar />

        {/* Navbar */}
        <nav className="absolute w-full max-w-[100vw] z-40 glass-nav transition-all duration-300" id="navbar">
          <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-8">
              <div className="flex items-center justify-between h-14 sm:h-20 lg:h-24">
                  {/* Logo - shown on mobile too */}
                  <div className="flex items-center gap-2 lg:gap-12 shrink-0">
                      {/* Mobile Hamburger Menu (Right side in RTL) */}
                      <div className="lg:hidden flex shrink-0">
                        <SidebarToggle />
                      </div>
                      
                      <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group hover-scale">
                          <div className="w-8 h-8 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#e50914] to-[#8a0006] flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.5)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.8)] transition-all duration-300">
                              <i className="fa-solid fa-play text-white ml-0.5 text-xs sm:text-sm lg:text-lg"></i>
                          </div>
                          <div className="flex flex-col leading-none">
                              <span className="text-lg sm:text-2xl lg:text-3xl font-black font-en tracking-wider text-white drop-shadow-md">ALEX<span className="text-alex-primary">CINEMA</span></span>
                              <span className="hidden sm:block text-[10px] text-gray-400 font-bold tracking-[0.15em] mt-1 uppercase opacity-80">Premium Platform</span>
                          </div>
                      </Link>
                  </div>
 
                  <div className="flex items-center gap-1.5 sm:gap-4 lg:gap-6 shrink-0">
                      <SearchBar />
                      <button className="hidden sm:flex w-9 h-9 sm:w-11 sm:h-11 rounded-full glass-panel border border-white/10 items-center justify-center hover:bg-white/10 hover:text-alex-primary transition-all hover-scale shadow-lg">
                          <i className="fa-regular fa-bell text-gray-300 text-base lg:text-lg"></i>
                      </button>
                      <button className="hidden sm:flex w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 border-alex-primary/50 overflow-hidden hover:border-alex-primary transition-all hover-scale shadow-[0_0_15px_rgba(229,9,20,0.3)]">
                          <img src="https://ui-avatars.com/api/?name=User&background=121826&color=e50914" alt="Profile" className="w-full h-full object-cover" />
                      </button>
                  </div>
              </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-grow lg:pr-72 pt-16 sm:pt-20 lg:pt-0">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#04060b] pt-16 pb-10 mt-auto relative z-10 lg:pr-72">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-alex-primary to-transparent opacity-30"></div>
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <Link href="/" className="flex items-center gap-3 hover-scale">
                        <div className="w-10 h-10 rounded-xl bg-alex-primary flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                            <i className="fa-solid fa-play text-white ml-0.5 text-sm"></i>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-2xl font-black font-en tracking-wider text-white">ALEX<span className="text-alex-primary">CINEMA</span></span>
                        </div>
                    </Link>
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
      </body>
    </html>
  );
}
