import FavoritesList from "@/components/FavoritesList";
import { getAuthUser } from "@/lib/getAuthUser";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/sign-in?redirect_url=/favorites");
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 pt-24 pb-16 relative z-10 min-h-screen" dir="rtl">
      {/* Ambient Red Neon Glow */}
      <div className="absolute top-10 right-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-[120px] pointer-events-none -z-10" />

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-[#0a0f1d] via-[#0d1424] to-[#0a0f1d] border border-white/[0.08] p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-16 -left-16 size-44 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-950/40 flex items-center justify-center border border-red-500/40 shadow-[0_0_30px_rgba(229,9,20,0.4)] shrink-0">
            <i className="fa-solid fa-heart text-red-500 text-2xl drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-red-400 bg-red-600/15 px-2.5 py-0.5 rounded-md border border-red-500/20">
                مكتبتي الخاصة
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">قائمة المفضلة السينمائية</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">الأفلام والمسلسلات التي قمت بحفظها للمشاهدة السريعة</p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Link
            href="/movies"
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-compass text-red-500" />
            <span>استكشف المزيد</span>
          </Link>
        </div>
      </div>

      {/* Content Body */}
      <div className="bg-[#060a14]/70 border border-white/[0.08] rounded-3xl backdrop-blur-xl p-5 sm:p-7 shadow-2xl">
        <FavoritesList />
      </div>
    </div>
  );
}
