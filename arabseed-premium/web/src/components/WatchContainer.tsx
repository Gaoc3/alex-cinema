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

  // Likes and Dislikes States
  const [likes, setLikes] = useState<number>(0);
  const [dislikes, setDislikes] = useState<number>(0);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

  // Initialize Likes/Dislikes and User Vote from localStorage
  useEffect(() => {
    setLikes(parseInt(video.Likes || '0'));
    setDislikes(parseInt(video.DisLikes || '0'));
    
    if (typeof window !== 'undefined') {
      const savedVote = localStorage.getItem(`alex_vote_${video.nb}`);
      if (savedVote === 'like' || savedVote === 'dislike') {
        setUserVote(savedVote);
      }
    }
  }, [video.nb, video.Likes, video.DisLikes]);

  const handleVote = (type: 'like' | 'dislike') => {
    if (typeof window === 'undefined') return;
    
    if (userVote === type) {
      // Undo current vote
      if (type === 'like') {
        setLikes(prev => Math.max(0, prev - 1));
      } else {
        setDislikes(prev => Math.max(0, prev - 1));
      }
      setUserVote(null);
      localStorage.removeItem(`alex_vote_${video.nb}`);
    } else {
      // Toggle/set vote
      if (userVote === 'like') {
        setLikes(prev => Math.max(0, prev - 1));
        setDislikes(prev => prev + 1);
      } else if (userVote === 'dislike') {
        setDislikes(prev => Math.max(0, prev - 1));
        setLikes(prev => prev + 1);
      } else {
        if (type === 'like') {
          setLikes(prev => prev + 1);
        } else {
          setDislikes(prev => prev + 1);
        }
      }
      setUserVote(type);
      localStorage.setItem(`alex_vote_${video.nb}`, type);
    }
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 w-full max-w-7xl mx-auto">
      
      {/* Right side on desktop: Player + Movie Details (spans 3 columns) */}
      <div className="lg:col-span-3 space-y-8">
        
        {/* Video Player */}
        <div className="w-full">
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

        {/* Action Buttons Block */}
        <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl shadow-lg border border-white/5">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFavorite}
              className={`flex items-center gap-2.5 font-bold text-sm px-5 py-2.5 rounded-xl border transition-all hover-scale cursor-pointer ${
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
              className="flex items-center gap-2.5 text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold text-sm bg-white/5 px-5 py-2.5 rounded-xl border border-white/5 hover-scale cursor-pointer"
            >
              <i className="fa-solid fa-share-nodes text-lg"></i> مشاركة
            </button>
          </div>
          
          {/* Interactive Likes/Dislikes Votes */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleVote('like')}
              className={`flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border transition-all hover-scale cursor-pointer ${
                userVote === 'like'
                  ? 'bg-green-600 text-white border-green-600 shadow-[0_0_15px_rgba(22,163,74,0.4)]'
                  : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 hover:text-green-300'
              }`}
              title="أعجبني"
            >
              <i className="fa-solid fa-thumbs-up text-base"></i> 
              <span className="font-en">{likes}</span>
            </button>
            <button 
              onClick={() => handleVote('dislike')}
              className={`flex items-center gap-2 text-sm font-bold px-3.5 py-2 rounded-xl border transition-all hover-scale cursor-pointer ${
                userVote === 'dislike'
                  ? 'bg-red-600 text-white border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                  : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 hover:text-red-300'
              }`}
              title="لم يعجبني"
            >
              <i className="fa-solid fa-thumbs-down text-base"></i> 
              <span className="font-en">{dislikes}</span>
            </button>
          </div>
        </div>

        {/* Details & Story Header Block (بحجم أصغر) */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-alex-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 relative z-10">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-2 tracking-tight drop-shadow-md">{displayTitle}</h1>
              {displayEnTitle && (
                <h2 className="text-base md:text-lg text-gray-400 font-en font-bold opacity-80 text-left" dir="ltr">{displayEnTitle} ({video.year})</h2>
              )}
              
              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                {video.categories?.map((cat: any, index: number) => (
                  <span key={cat.nb || index} className="bg-alex-primary/20 text-alex-primary border border-alex-primary/30 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{cat.ar_title}</span>
                ))}
                <span className="bg-white/5 text-gray-200 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <i className="fa-regular fa-clock text-gray-400"></i> <span className="font-en">{Math.floor((video.duration || 0) / 60)}</span> دقيقة
                </span>
                <span className="bg-white/5 text-gray-200 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <i className="fa-regular fa-calendar text-gray-400"></i> <span className="font-en">{video.year}</span>
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1608] to-[#0a0803] border border-yellow-500/20 px-5 py-3.5 rounded-2xl shadow-[0_0_15px_rgba(234,179,8,0.08)]">
                <div className="flex items-center gap-2 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                  <i className="fa-solid fa-star text-xl"></i>
                  <span className="text-3xl font-black font-en leading-none">{video.stars}</span>
                </div>
                <span className="text-yellow-500/60 text-[10px] font-bold mt-1.5 uppercase tracking-wider">تقييم المشاهدين</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t pt-8 border-white/10 relative z-10">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2.5">
              <div className="w-1.5 h-5.5 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.4)]"></div> القصة
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base font-medium opacity-90">
              {displayContent}
            </p>
          </div>
        </div>

        {/* Seasons & Episodes Section (Only for Series) */}
        {isSeries && episodes.length > 0 && (
          <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>
            
            <h3 className="text-lg font-black text-white mb-5 flex items-center gap-2.5 relative z-10">
              <div className="w-1.5 h-5.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.4)]"></div> حلقات المسلسل
            </h3>

            {/* Seasons selector */}
            {seasons.length > 1 && (
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

            {/* Active Episode Banner */}
            {activeEpisode && (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 animate-fade-in-up">
                <div>
                  <div className="text-xs text-gray-500 font-bold">الحلقة المعروضة حالياً</div>
                  <div className="text-sm font-black text-white mt-1">
                    الحلقة {activeEpisode.episodeNummer}
                    {activeEpisode.ar_title && activeEpisode.ar_title !== video.ar_title && ` : ${activeEpisode.ar_title}`}
                  </div>
                </div>
                {(activeEpisode.duration || video.duration) && (
                  <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg font-en font-bold">
                    {Math.floor((parseInt(activeEpisode.duration || '0') || parseInt(video.duration || '0')) / 60) || 45} دقيقة
                  </span>
                )}
              </div>
            )}

            {/* Episodes grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 relative z-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {seasonEpisodes.map((ep) => (
                <button
                  key={ep.nb}
                  onClick={() => setActiveEpisode(ep)}
                  className={`h-11 rounded-xl border flex items-center justify-center font-bold text-sm transition-all hover-scale cursor-pointer ${
                    activeEpisode?.nb === ep.nb
                      ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)] font-black'
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/10'
                  }`}
                  title={ep.ar_title && ep.ar_title !== video.ar_title ? ep.ar_title : `الحلقة ${ep.episodeNummer}`}
                >
                  <span className="font-en">{ep.episodeNummer}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Left side on desktop: Poster & Metadata info (lg:col-span-1) */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-28">
        
        {/* Card 1: Poster & IMDB Link */}
        <div className="glass-panel rounded-3xl p-5 shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-alex-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <div className="relative rounded-2xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border border-white/10 mb-4 group">
            <img 
              src={`https://cnth2.shabakaty.com/vascin-poster-images/${video.img}`} 
              alt="Poster" 
              className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-transparent to-transparent opacity-65"></div>
          </div>
          
          {video.imdbUrlRef && (
            <a 
              href={video.imdbUrlRef} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center justify-center gap-2.5 w-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 text-yellow-400 border border-yellow-500/30 py-3 rounded-xl font-bold text-base hover:from-yellow-500/30 hover:to-yellow-600/20 transition-all hover-scale"
            >
              <i className="fa-brands fa-imdb text-xl"></i>
              <span>صفحة IMDB</span>
            </a>
          )}
        </div>

        {/* Card 2: Additional Metadata (Info) */}
        <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-white/5">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-alex-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
          
          <div className="relative z-10">
            <h4 className="text-white font-black text-lg mb-5 flex items-center gap-2.5">
              <i className="fa-solid fa-circle-info text-alex-primary"></i> 
              <span>معلومات إضافية</span>
            </h4>
            
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400">النوع</span>
                <span className="text-white font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">
                  {video.kind === '1' ? 'فيلم' : 'مسلسل'}
                </span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400">السنة</span>
                <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">{video.year}</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400">المدة</span>
                <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">{Math.floor((video.duration || 0) / 60)} دقيقة</span>
              </li>
              <li className="flex justify-between items-center pb-1">
                <span className="text-gray-400">تاريخ الإضافة</span>
                <span className="text-gray-300 font-bold font-en bg-black/20 border border-white/5 px-3 py-1 rounded-lg">{video.itemDate?.split(' ')[0] || video.mDate}</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
