'use client';

import React, { useState, useEffect } from 'react';
import AlexPlayer from './AlexPlayer';

interface Stream {
  name: string;
  resolution: string;
  container: string;
  videoUrl: string;
}

interface Episode {
  nb: string;
  ar_title: string;
  en_title: string;
  episodeNummer: string;
  season: string;
  duration?: string;
  publishDate?: string;
  stars?: string;
  ar_content?: string;
}

interface Season {
  season: string;
}

interface WatchContainerProps {
  video: any;
  seasons: Season[];
  episodes: Episode[];
}

export default function WatchContainer({ video, seasons, episodes }: WatchContainerProps) {
  const isSeries = video.kind === '2';
  
  // For series, active episode state. Default to first episode of first season.
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [episodeStreams, setEpisodeStreams] = useState<Stream[]>([]);
  const [activeEpisodeDetails, setActiveEpisodeDetails] = useState<any>(null);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [favoriteList, setFavoriteList] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Initialize favorite status from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('alex_favorites');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setFavoriteList(parsed);
        setIsFavorite(parsed.includes(video.nb));
      } catch (e) {}
    }
  }, [video.nb]);

  const toggleFavorite = () => {
    let newList = [...favoriteList];
    if (isFavorite) {
      newList = newList.filter(id => id !== video.nb);
      setIsFavorite(false);
    } else {
      newList.push(video.nb);
      setIsFavorite(true);
    }
    setFavoriteList(newList);
    localStorage.setItem('alex_favorites', JSON.stringify(newList));
  };

  // Set default season and episode on load
  useEffect(() => {
    if (isSeries && episodes.length > 0) {
      const sortedEpisodes = [...episodes].sort((a, b) => {
        const numA = parseInt(a.episodeNummer) || 0;
        const numB = parseInt(b.episodeNummer) || 0;
        return numA - numB;
      });
      
      const firstEp = sortedEpisodes[0];
      setActiveEpisode(firstEp);
      setCurrentSeason(firstEp.season || '1');
    }
  }, [isSeries, episodes]);

  // Fetch streams and details when active episode changes (for series)
  useEffect(() => {
    if (isSeries && activeEpisode) {
      fetchEpisodeDetails(activeEpisode.nb);
    } else {
      // For movie, use initial streams and details passed in video
      setEpisodeStreams(video.streams || []);
      setActiveEpisodeDetails(null);
    }
  }, [activeEpisode, isSeries, video]);

  const fetchEpisodeDetails = async (episodeId: string) => {
    setIsLoadingStreams(true);
    try {
      const [infoRes, streamsRes] = await Promise.all([
        fetch(`/api/proxy?endpoint=allVideoInfo/id/${episodeId}`),
        fetch(`/api/proxy?endpoint=transcoddedFiles/id/${episodeId}`)
      ]);

      let info: any = {};
      let streams: any[] = [];

      if (infoRes.ok) {
        info = await infoRes.json();
      }
      if (streamsRes.ok) {
        streams = await streamsRes.json();
      }

      const combined = {
        ...info,
        streams: Array.isArray(streams) ? streams : []
      };

      setActiveEpisodeDetails(combined);
      setEpisodeStreams(combined.streams);
    } catch (e) {
      console.error("Failed to fetch episode details:", e);
      setActiveEpisodeDetails(null);
      setEpisodeStreams([]);
    } finally {
      setIsLoadingStreams(false);
    }
  };

  // Determine if there is a next episode
  const sortedEpisodesList = [...episodes].sort((a, b) => {
    const numA = parseInt(a.episodeNummer) || 0;
    const numB = parseInt(b.episodeNummer) || 0;
    return numA - numB;
  });

  const activeIndex = activeEpisode
    ? sortedEpisodesList.findIndex(ep => ep.nb === activeEpisode.nb)
    : -1;

  const hasNextEpisode = isSeries && activeIndex !== -1 && activeIndex < sortedEpisodesList.length - 1;

  const playNextEpisode = () => {
    if (hasNextEpisode) {
      const nextEp = sortedEpisodesList[activeIndex + 1];
      setActiveEpisode(nextEp);
      setCurrentSeason(nextEp.season || '1');
    }
  };

  // Filter episodes for selected season
  const seasonEpisodes = episodes
    .filter(ep => ep.season === currentSeason)
    .sort((a, b) => {
      const numA = parseInt(a.episodeNummer) || 0;
      const numB = parseInt(b.episodeNummer) || 0;
      return numA - numB;
    });

  // Display details (use active episode's title/info for series)
  const displayTitle = isSeries && activeEpisode
    ? `${video.ar_title} - الحلقة ${activeEpisode.episodeNummer}`
    : video.ar_title;

  const displayEnTitle = isSeries && activeEpisode
    ? `${video.en_title || video.ar_title} - Episode ${activeEpisode.episodeNummer}`
    : video.en_title;

  const displayContent = isSeries && activeEpisode && activeEpisode.ar_content
    ? activeEpisode.ar_content
    : video.ar_content;

  return (
    <div className="flex flex-col gap-10 max-w-7xl mx-auto">
      
      {/* Top Main Stage - Video Player */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-black rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 relative group transition-all duration-300 hover:border-alex-primary/30">
          {isLoadingStreams ? (
            <div className="aspect-video w-full flex flex-col items-center justify-center bg-alex-card">
              <div className="w-16 h-16 border-4 border-alex-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]"></div>
              <p className="text-gray-400 font-bold">جاري تحميل جودات البث المباشر...</p>
            </div>
          ) : (
            <AlexPlayer 
              videoData={
                isSeries && activeEpisodeDetails
                  ? {
                      trailer: video.trailer,
                      stream_url: activeEpisodeDetails.streams?.length > 0 
                        ? activeEpisodeDetails.streams[0].videoUrl 
                        : (activeEpisodeDetails.fileFile 
                            ? `https://cndw2.shabakaty.com/m240/${activeEpisodeDetails.fileFile}` 
                            : ''),
                      img: video.img,
                      ar_title: displayTitle,
                      streams: activeEpisodeDetails.streams || [],
                      translations: activeEpisodeDetails.translations || [],
                      introSkipping: activeEpisodeDetails.introSkipping || [],
                      skippingDurations: activeEpisodeDetails.skippingDurations || null,
                      duration: activeEpisodeDetails.duration || activeEpisodeDetails.Duration || null,
                      arTranslationFilePath: activeEpisodeDetails.arTranslationFilePath || '',
                      enTranslationFilePath: activeEpisodeDetails.enTranslationFilePath || ''
                    }
                  : {
                      trailer: video.trailer,
                      stream_url: video.streams?.length > 0 ? video.streams[0].videoUrl : video.stream_url,
                      img: video.img,
                      ar_title: displayTitle,
                      streams: video.streams || [],
                      translations: video.translations || [],
                      introSkipping: video.introSkipping || [],
                      skippingDurations: video.skippingDurations || null,
                      duration: video.duration || video.Duration || null,
                      arTranslationFilePath: video.arTranslationFilePath || '',
                      enTranslationFilePath: video.enTranslationFilePath || ''
                    }
              }
              onNextEpisode={hasNextEpisode ? playNextEpisode : undefined}
            />
          )}
        </div>
      </div>

      {/* Bottom Content divided into two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 w-full">
        
        {/* Right Column: Title, metadata, episodes, story (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Action Buttons Block */}
          <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-5 rounded-2xl shadow-lg border border-white/5">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleFavorite}
                className={`flex items-center gap-2.5 font-bold text-sm px-5 py-3 rounded-xl border transition-all hover-scale cursor-pointer ${
                  isFavorite 
                    ? 'bg-alex-primary text-white border-alex-primary shadow-[0_0_15px_rgba(229,9,20,0.4)]' 
                    : 'bg-white/5 text-gray-300 border-white/5 hover:text-white hover:bg-white/10'
                }`}
              >
                <i className={`fa-heart text-lg ${isFavorite ? 'fa-solid' : 'fa-regular'}`}></i> 
                {isFavorite ? 'مضاف للمفضلة' : 'أضف للمفضلة'}
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ رابط الصفحة لمشاركتها!');
                }}
                className="flex items-center gap-2.5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold text-sm bg-white/5 px-5 py-3 rounded-xl border border-white/5 hover-scale cursor-pointer"
              >
                <i className="fa-solid fa-share-nodes text-lg"></i> مشاركة
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-400 text-sm font-bold bg-green-400/10 border border-green-400/20 px-4 py-2 rounded-xl">
                <i className="fa-solid fa-thumbs-up"></i> <span className="font-en">{video.Likes || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-400/10 border border-red-400/20 px-4 py-2 rounded-xl">
                <i className="fa-solid fa-thumbs-down"></i> <span className="font-en">{video.DisLikes || 0}</span>
              </div>
            </div>
          </div>

          {/* Details & Story Header Block */}
          <div className="glass-panel rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-alex-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-3 tracking-tight drop-shadow-md">{displayTitle}</h1>
                {displayEnTitle && (
                  <h2 className="text-lg md:text-xl text-gray-400 font-en font-bold opacity-80">{displayEnTitle} ({video.year})</h2>
                )}
                
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {video.categories?.map((cat: any, index: number) => (
                    <span key={cat.nb || index} className="bg-alex-primary/20 text-alex-primary border border-alex-primary/30 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm">{cat.ar_title}</span>
                  ))}
                  <span className="bg-white/5 text-gray-200 px-4 py-1.5 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i className="fa-regular fa-clock text-gray-400"></i> <span className="font-en">{Math.floor((video.duration || 0) / 60)}</span> دقيقة
                  </span>
                  <span className="bg-white/5 text-gray-200 px-4 py-1.5 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-2 shadow-sm">
                    <i className="fa-regular fa-calendar text-gray-400"></i> <span className="font-en">{video.year}</span>
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col items-end shrink-0">
                <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1608] to-[#0a0803] border border-yellow-500/20 px-6 py-4 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                  <div className="flex items-center gap-2.5 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    <i className="fa-solid fa-star text-2xl"></i>
                    <span className="text-4xl font-black font-en leading-none">{video.stars}</span>
                  </div>
                  <span className="text-yellow-500/60 text-xs font-bold mt-2 uppercase tracking-wider">تقييم المشاهدين</span>
                </div>
              </div>
            </div>
            
            <div className="mt-10 border-t border-white/10 pt-10 relative z-10">
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div> القصة
              </h3>
              <p className="text-gray-300 leading-loose text-base md:text-lg font-medium opacity-90">
                {displayContent}
              </p>
            </div>
          </div>

          {/* Seasons & Episodes Section (Only for Series) */}
          {isSeries && episodes.length > 0 && (
            <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
              
              <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div> حلقات المسلسل
              </h3>

              {/* Seasons selector */}
              {seasons.length > 1 && (
                <div className="flex flex-wrap gap-2.5 pb-6 border-b border-white/5 mb-6 relative z-10">
                  {seasons.map((s) => (
                    <button
                      key={s.season}
                      onClick={() => setCurrentSeason(s.season)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all hover-scale cursor-pointer ${
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

              {/* Episodes grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 relative z-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {seasonEpisodes.map((ep) => (
                  <button
                    key={ep.nb}
                    onClick={() => setActiveEpisode(ep)}
                    className={`p-4 rounded-2xl border text-right transition-all hover-scale cursor-pointer ${
                      activeEpisode?.nb === ep.nb
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-md shadow-blue-500/5'
                        : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-gray-500 mb-1">الموسم {ep.season}</div>
                    <div className="font-black text-sm line-clamp-1">الحلقة {ep.episodeNummer}</div>
                    {ep.ar_title && ep.ar_title !== video.ar_title && (
                      <div className="text-[10px] text-gray-400 mt-1 truncate">{ep.ar_title}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Left Column: Poster & Metadata info (lg:col-span-1) */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-3xl p-6 shadow-2xl lg:sticky lg:top-32 relative overflow-hidden border border-white/5">
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-alex-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
            
            <div className="relative rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/10 mb-8 group">
              <img 
                src={`https://cnth2.shabakaty.com/vascin-poster-images/${video.img}`} 
                alt="Poster" 
                className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-60"></div>
            </div>
            
            {video.imdbUrlRef && (
              <a href={video.imdbUrlRef} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500/30 transition-all hover-scale mb-5">
                <i className="fa-brands fa-imdb text-2xl"></i>
                <span>صفحة IMDB</span>
              </a>
            )}

            <div className="pt-2 relative z-10">
              <h4 className="text-white font-black text-lg mb-6 flex items-center gap-2.5">
                <i className="fa-solid fa-circle-info text-alex-primary"></i> معلومات إضافية
              </h4>
              <ul className="space-y-5 text-sm font-medium">
                <li className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-gray-500">النوع</span>
                  <span className="text-white font-bold bg-white/10 px-4 py-1.5 rounded-lg shadow-sm">
                    {video.kind === '1' ? 'فيلم' : 'مسلسل'}
                  </span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-gray-500">السنة</span>
                  <span className="text-white font-bold font-en bg-white/10 px-4 py-1.5 rounded-lg shadow-sm">{video.year}</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-gray-500">المدة</span>
                  <span className="text-white font-bold font-en bg-white/10 px-4 py-1.5 rounded-lg shadow-sm">{Math.floor((video.duration || 0) / 60)} دقيقة</span>
                </li>
                <li className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-gray-500">تاريخ الإضافة</span>
                  <span className="text-gray-300 font-bold font-en bg-black/30 px-4 py-1.5 rounded-lg">{video.itemDate?.split(' ')[0] || video.mDate}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
