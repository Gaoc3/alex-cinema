import type { ReactNode } from "react";
import Link from "next/link";
import InteractiveCinematicBg from "@/components/auth/InteractiveCinematicBg";

interface AuthPageShellProps {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
}

export default function AuthPageShell({ mode, children }: AuthPageShellProps) {
  return (
    <div
      className="auth-page-shell relative flex min-h-[100svh] w-full flex-col overflow-x-hidden bg-[#0a1728] px-4 py-4 text-white sm:px-6 sm:py-6"
      data-auth-mode={mode}
    >
      <InteractiveCinematicBg />

      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_75%_12%,rgba(229,9,20,0.18),transparent_34%),radial-gradient(circle_at_18%_82%,rgba(14,165,233,0.15),transparent_38%),linear-gradient(135deg,rgba(9,22,40,0.08),rgba(5,12,24,0.34))]" />

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[92rem] flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 py-1 sm:gap-4 lg:py-2">
          <Link href="/" className="group inline-flex min-w-0 items-center gap-2 sm:gap-3" aria-label="AleX Cinema">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/15 text-red-300 shadow-[0_0_25px_rgba(229,9,20,0.2)] transition group-hover:scale-105 sm:size-10">
              <i className="fa-solid fa-play text-sm" aria-hidden="true" />
            </span>
            <span dir="ltr" className="whitespace-nowrap font-en text-base font-black tracking-[0.08em] text-white min-[360px]:text-lg sm:text-xl sm:tracking-[0.12em]">
              ALEX <span className="text-[#f21b26]">CINEMA</span>
            </span>
          </Link>

          <Link
            href="/home"
            aria-label="تصفح المنصة"
            className="inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] text-xs font-extrabold text-slate-200 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 min-[360px]:size-auto min-[360px]:px-3 min-[360px]:py-2.5 sm:px-4"
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">تصفح المنصة</span>
          </Link>
        </header>

        <main className="auth-main flex min-h-0 flex-1 items-center justify-center py-5 sm:py-8">
          <div className="flex min-w-0 w-full items-center justify-center px-0.5">{children}</div>
        </main>
      </div>
    </div>
  );
}
