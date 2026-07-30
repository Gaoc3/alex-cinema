export default function TelegramAppLoading() {
  return (
    <main
      dir="rtl"
      className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#07111f] p-4 text-white"
    >
      <div
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-3xl border border-white/15 bg-[#102139]/95 p-7 text-center shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
        role="status"
        aria-live="polite"
      >
        <p dir="ltr" className="font-en text-xl font-black tracking-[0.12em] text-white">
          ALEX <span className="text-[#f21b26]">CINEMA</span>
        </p>
        <div className="size-11 animate-spin rounded-full border-4 border-red-500/25 border-t-[#e50914] motion-reduce:animate-none" />
        <p className="text-sm font-bold text-slate-100">جاري فتح المنصة...</p>
      </div>
    </main>
  );
}
