import type { ReactNode } from "react";
import Link from "next/link";
import InteractiveCinematicBg from "@/components/auth/InteractiveCinematicBg";

interface AuthPageShellProps {
  mode: "sign-in" | "sign-up";
  children: ReactNode;
}

const features = [
  { icon: "fa-users", title: "غرف مشاهدة مباشرة", description: "شاهد وتفاعل مع أصدقائك لحظة بلحظة." },
  { icon: "fa-bookmark", title: "مكتبتك دائمًا معك", description: "احفظ المفضلة وتابع من أي جهاز." },
  { icon: "fa-shield-halved", title: "دخول محمي ومتعدد الخيارات", description: "تيليجرام أو حساب المنصة مع حماية متقدمة." },
];

export default function AuthPageShell({ mode, children }: AuthPageShellProps) {
  return (
    <div className="auth-page-shell relative flex min-h-[100svh] w-full flex-col overflow-x-hidden bg-[#07111f] px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-10 lg:py-8">
      <InteractiveCinematicBg />

      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_78%_18%,rgba(229,9,20,0.2),transparent_34%),radial-gradient(circle_at_15%_78%,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_50%_48%,rgba(59,130,246,0.08),transparent_42%)]" />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(120deg,rgba(3,8,18,0.04),rgba(3,8,18,0.48))]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[92rem] flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 py-1 sm:gap-4 lg:py-2">
          <Link href="/" className="group inline-flex min-w-0 items-center gap-2 sm:gap-3" aria-label="AleX Cinema">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 shadow-[0_0_25px_rgba(229,9,20,0.16)] transition group-hover:scale-105 sm:size-10">
              <i className="fa-solid fa-play text-sm" aria-hidden="true" />
            </span>
            <span dir="ltr" className="whitespace-nowrap font-en text-base font-black tracking-[0.08em] text-white min-[360px]:text-lg sm:text-xl sm:tracking-[0.12em]">
              ALEX <span className="text-[#e50914]">CINEMA</span>
            </span>
          </Link>

          <Link
            href="/home"
            aria-label="تصفح المنصة"
            className="inline-flex size-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-extrabold text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 min-[360px]:size-auto min-[360px]:px-3 min-[360px]:py-2.5 sm:px-4"
          >
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">تصفح المنصة</span>
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 py-5 sm:py-7 lg:grid-cols-[minmax(0,0.88fr)_minmax(30rem,1.12fr)] lg:gap-14 lg:py-8 xl:gap-20">
          <aside className="hidden max-w-xl lg:block">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/[0.08] px-4 py-2 text-xs font-black text-red-300 backdrop-blur-md">
              <span className="size-1.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]" />
              تجربة سينمائية اجتماعية
            </div>

            <h2 className="max-w-lg text-4xl font-black leading-[1.25] tracking-tight text-white xl:text-5xl">
              كل مشاهداتك،
              <span className="mt-1 block bg-gradient-to-l from-red-400 via-[#e50914] to-orange-400 bg-clip-text text-transparent">
                في حساب واحد آمن.
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-base font-semibold leading-8 text-slate-300">
              {mode === "sign-in"
                ? "ارجع إلى أفلامك المفضلة وغرفك النشطة، وتابع المشاهدة من حيث توقفت."
                : "أنشئ حسابك خلال لحظات وابدأ مشاركة الأفلام والمسلسلات مع من تحب."}
            </p>

            <div className="mt-9 grid gap-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.075]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-red-400 transition group-hover:border-red-400/25 group-hover:bg-red-500/10">
                    <i className={`fa-solid ${feature.icon}`} aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-sm font-black text-slate-100">{feature.title}</strong>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-400">
                      {feature.description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex w-full items-center justify-center lg:justify-end">{children}</div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] py-3 text-[0.68rem] font-semibold text-slate-500 sm:flex-row sm:py-4">
          <span>© 2026 AleX Cinema</span>
          <span className="inline-flex items-center gap-2">
            <i className="fa-solid fa-lock text-emerald-500" aria-hidden="true" />
            اتصال آمن وحماية متعددة الطبقات
          </span>
        </footer>
      </div>
    </div>
  );
}
