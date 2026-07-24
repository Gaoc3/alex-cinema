import CustomAuthCard from "@/components/auth/CustomAuthCard";
import InteractiveCinematicBg from "@/components/auth/InteractiveCinematicBg";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="h-screen w-screen max-w-[100vw] overflow-hidden flex flex-col items-center justify-center relative bg-[#020408] select-none p-4 sm:p-6">
      {/* 60fps Interactive Luminous Mouse Tracking Background */}
      <InteractiveCinematicBg />

      {/* Top Right Home Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <Link 
          href="/" 
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-xs sm:text-sm md:text-base font-bold transition-all duration-300 backdrop-blur-md shadow-lg"
        >
          <i className="fa-solid fa-arrow-right text-xs"></i>
          <span>الرئيسية</span>
        </Link>
      </div>

      {/* Prominent Mathematically Centered Desktop Auth Card Container */}
      <div className="relative z-10 w-full max-w-[clamp(24rem,44vw,50rem)] flex flex-col items-center justify-center my-auto transition-all duration-300">
        {/* Logo & Header */}
        <div className="text-center mb-3 sm:mb-4 select-none">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1" dir="ltr">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-en tracking-wider drop-shadow-md">ALEX</span>
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#e50914] font-en tracking-wider drop-shadow-[0_0_30px_rgba(229,9,20,0.8)]">CINEMA</span>
          </div>
          <p className="text-gray-300 text-xs sm:text-sm md:text-base font-bold tracking-wide">أنشئ حساباً جديداً للمشاهدة الجماعية</p>
        </div>
        
        {/* Auth Component */}
        <CustomAuthCard mode="sign-up" />
      </div>
    </main>
  );
}
