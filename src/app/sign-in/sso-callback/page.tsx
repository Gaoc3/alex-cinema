import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import CinematicLogo from '@/components/CinematicLogo'

export default function SSOCallback() {
  return (
    <div className="min-h-screen bg-[#06070a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-tr from-red-950/20 via-black to-[#03060f]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.9)_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="animate-pulse">
          <CinematicLogo />
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm font-medium animate-pulse">جاري إتمام تسجيل الدخول...</p>
        </div>
      </div>

      {/* Hidden Clerk Callback Component */}
      <div className="hidden">
        <AuthenticateWithRedirectCallback signUpForceRedirectUrl="/" signInForceRedirectUrl="/" />
      </div>
    </div>
  )
}
