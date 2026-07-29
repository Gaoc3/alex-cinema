import FavoritesList from "@/components/FavoritesList";
import { getAuthUser } from "@/lib/getAuthUser";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 pt-24 pb-12 relative z-10 min-h-screen" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
          <i className="fa-solid fa-heart text-pink-500 text-xl"></i>
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-wide">قائمة المفضلة</h1>
          <p className="text-gray-400 text-sm mt-1">الأفلام والمسلسلات التي قمت بحفظها</p>
        </div>
      </div>

        <div className="bg-[#0a0a0f]/50 border border-white/5 rounded-3xl backdrop-blur-sm p-4 sm:p-6">
          <FavoritesList />
        </div>
    </div>
  );
}
