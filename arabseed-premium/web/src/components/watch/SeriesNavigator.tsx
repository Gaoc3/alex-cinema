import React from 'react';

interface SeriesNavigatorProps {
  seasons: any[];
  episodes: any[];
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  activeEpisode: any;
  setActiveEpisode: (ep: any) => void;
  seasonEpisodes: any[];
  videoTitle: string;
}

export default function SeriesNavigator({
  seasons,
  episodes,
  currentSeason,
  setCurrentSeason,
  activeEpisode,
  setActiveEpisode,
  seasonEpisodes,
  videoTitle
}: SeriesNavigatorProps) {
  return (
    <div className="grid grid-cols-12 gap-8 items-stretch">
      {/* Episodes Grid (lg:col-span-9) */}
      <div className="col-span-12 lg:col-span-9 flex flex-col">
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5 h-full flex flex-col gap-6">
          
          <div>
            <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2.5 relative z-10">
              <div className="w-1.5 h-5.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div> حلقات المسلسل
            </h3>

            {seasons.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-5 border-b border-white/5 mb-5 relative z-10">
                {seasons.map((s) => (
                  <button
                    key={s.season}
                    onClick={() => setCurrentSeason(s.season)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all hover-scale cursor-pointer ${
                      currentSeason === s.season
                        ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] border border-blue-600'
                        : 'bg-white/5 text-gray-300 border border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    الموسم {s.season}
                  </button>
                ))}
              </div>
            )}

            {activeEpisode && (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 animate-fade-in-up">
                <div>
                  <div className="text-xs text-gray-500 font-bold">الحلقة المعروضة حالياً</div>
                  <div className="text-sm font-black text-white mt-1">
                    الحلقة {activeEpisode.episodeNummer}
                    {activeEpisode.ar_title && activeEpisode.ar_title !== videoTitle && ` : ${activeEpisode.ar_title}`}
                  </div>
                </div>
                {(activeEpisode.duration || (episodes.length > 0 && episodes[0].duration)) && (
                  <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg font-en font-bold">
                    {Math.floor((parseInt(activeEpisode.duration || episodes[0].duration || '0')) / 60) || 45} دقيقة
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 relative z-10 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
            {seasonEpisodes.map((ep) => (
              <button
                key={ep.nb}
                onClick={() => setActiveEpisode(ep)}
                className={`h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all hover-scale cursor-pointer ${
                  activeEpisode?.nb === ep.nb
                    ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)] font-black'
                    : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'
                }`}
                title={ep.ar_title && ep.ar_title !== videoTitle ? ep.ar_title : `الحلقة ${ep.episodeNummer}`}
              >
                <span className="font-en">{ep.episodeNummer}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Series Status Card (lg:col-span-3) */}
      <div className="col-span-12 lg:col-span-3 flex flex-col">
        <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-white/5 h-full flex flex-col justify-between">
          
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-white font-black text-lg mb-6 flex items-center gap-2.5">
                <i className="fa-solid fa-chart-simple text-blue-500"></i>
                <span>إحصائيات المسلسل</span>
              </h4>
              
              <ul className="space-y-4.5 text-sm font-medium">
                <li className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-400">المواسم</span>
                  <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                    {seasons.length}
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-400">إجمالي الحلقات</span>
                  <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                    {episodes.length}
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-3">
                  <span className="text-gray-400">الترجمة</span>
                  <span className="text-white font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
                    مترجم للعربية
                  </span>
                </li>
                <li className="flex justify-between items-center pb-1">
                  <span className="text-gray-400">الجودة</span>
                  <span className="text-yellow-500 font-bold bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg">
                    1080p FHD
                  </span>
                </li>
              </ul>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-gray-500 font-bold text-center">
              سينمانا بريميوم
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
