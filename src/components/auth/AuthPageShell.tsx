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
    <div className="relative min-h-[100svh] w-full overflow-x-hidden bg-[#020408] px-4 py-6 text-white sm:px-6 lg:px-10 lg:py-8">
      <InteractiveCinematicBg />

      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_78%_18%,rgba(229,9,20,0.15),transparent_32%),radial-gradient(circle_at_15%_78%,rgba(14,165,233,0.1),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[linear-gradient(120deg,rgba(2,4,8,0.2),rgba(2,4,8,0.78))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-[92rem] flex-col">
        <header className="flex items-center justify-between gap-4 py-1 lg:py-2">
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="AleX Cinema">
            <span className="flex size-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-400 shadow-[0_0_25px_rgba(229,9,20,0.16)] transition group-hover:scale-105">
              <i className="fa-solid fa-play text-sm" aria-hidden="true" />
            </span>
            <span className="font-en text-lg font-black tracking-[0.12em] text-white sm:text-xl">
              ALEX <span className="text-[#e50914]">CINEMA</span>
            </span>
          </Link>

          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-extrabold text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            تصفح المنصة
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(32rem,1.12fr)] lg:gap-16 lg:py-10 xl:gap-24">
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
            <p className="mt-5 max-w-lg text-base font-semibold leading-8 text-slate-400">
              {mode === "sign-in"
                ? "ارجع إلى أفلامك المفضلة وغرفك النشطة، وتابع المشاهدة من حيث توقفت."
                : "أنشئ حسابك خلال لحظات وابدأ مشاركة الأفلام والمسلسلات مع من تحب."}
            </p>

            <div className="mt-9 grid gap-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 backdrop-blur-sm transition hover:border-white/15 hover:bg-white/[0.045]"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-red-400 transition group-hover:border-red-400/25 group-hover:bg-red-500/10">
                    <i className={`fa-solid ${feature.icon}`} aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block text-sm font-black text-slate-100">{feature.title}</strong>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                      {feature.description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex w-full items-center justify-center lg:justify-end">{children}</div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] py-4 text-[0.68rem] font-semibold text-slate-600 sm:flex-row">
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
