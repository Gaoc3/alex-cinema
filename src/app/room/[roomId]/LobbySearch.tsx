'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { decryptData } from '@/utils/cryptoHelper';
import { getVideoImageUrl } from '@/utils/imageHelper';
import toast from 'react-hot-toast';

interface SearchResult {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  kind?: string;
}

interface LobbySearchProps {
  roomId: string;
}

const ARABIC_EN_MAP: Record<string, string> = {
  'باتمان': 'batman',
  'سبايدرمان': 'spider-man',
  'سوبرمان': 'superman',
  'انتقام': 'avengers',
  'المنتقمون': 'avengers',
  'هاري بوتر': 'harry potter',
  'جوكر': 'joker',
  'تيتانيك': 'titanic',
  'ماتريكس': 'matrix',
  'ترانسفورمرز': 'transformers',
  'توب غان': 'top gun',
  'فاست': 'fast',
  'افاتار': 'avatar',
  'أفاتار': 'avatar'
};

function getEnglishSearchQuery(arQuery: string): string {
  const q = arQuery.trim().toLowerCase();
  for (const [ar, en] of Object.entries(ARABIC_EN_MAP)) {
    if (q.includes(ar)) return en;
  }
  return q;
}

export default function LobbySearch({ roomId }: LobbySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const controller = new AbortController();
    const { signal } = controller;

    debounceTimer.current = setTimeout(async () => {
      try {
        const queriesToTry = [query];
        const mappedEn = getEnglishSearchQuery(query);
        if (mappedEn !== query.trim().toLowerCase()) {
          queriesToTry.push(mappedEn);
        }

        let combinedResults: SearchResult[] = [];

        for (const qTerm of queriesToTry) {
          const queryEncoded = encodeURIComponent(qTerm);
          const [resMovies, resSeries] = await Promise.all([
            fetch(`/api/proxy?endpoint=AdvancedSearch&level=2&videoTitle=${queryEncoded}&staffTitle=&page=0&year=1900,2026&type=movies`, { signal }),
            fetch(`/api/proxy?endpoint=AdvancedSearch&level=2&videoTitle=${queryEncoded}&staffTitle=&page=0&year=1900,2026&type=series`, { signal })
          ]);

          let moviesList: SearchResult[] = [];
          let seriesList: SearchResult[] = [];

          if (resMovies.ok) {
            const encrypted_data = await resMovies.json();
            const data = decryptData(encrypted_data.payload);
            moviesList = Array.isArray(data) ? data : [];
          }
          if (resSeries.ok) {
            const encrypted_data = await resSeries.json();
            const data = decryptData(encrypted_data.payload);
            seriesList = Array.isArray(data) ? data : [];
          }

          combinedResults.push(...moviesList, ...seriesList);
        }

        const unique = Array.from(new Map(combinedResults.map(item => [item.nb, item])).values());
        const queryClean = query.trim().toLowerCase();

        const sorted = unique.sort((a, b) => {
          const titleA = (a.en_title || a.ar_title || '').trim().toLowerCase();
          const titleB = (b.en_title || b.ar_title || '').trim().toLowerCase();

          const exactA = titleA === queryClean;
          const exactB = titleB === queryClean;
          if (exactA && !exactB) return -1;
          if (!exactA && exactB) return 1;

          const startsA = titleA.startsWith(queryClean);
          const startsB = titleB.startsWith(queryClean);
          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;

          const starsA = parseFloat(a.stars) || 0;
          const starsB = parseFloat(b.stars) || 0;
          return starsB - starsA;
        });

        if (!signal.aborted) {
          setResults(sorted.slice(0, 18));
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [query]);

import toast from 'react-hot-toast';

  const handleSelectVideo = async (item: SearchResult) => {
    setIsLoading(true);
    try {
      const { updateRoomVideo } = await import('@/app/actions/room.actions');
      const res = await updateRoomVideo(roomId, {
        movieId: item.nb,
        movieTitle: item.ar_title || item.en_title,
        moviePoster: item.img
      });
      if (res.success) {
        toast.success(`تم اختيار ${item.ar_title || item.en_title} للروم! 🎬`);
        router.push(`/room/${roomId}?videoId=${item.nb}`);
      } else {
        toast.error(res.error || 'حدث خطأ أثناء اختيار الفيديو للروم');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 text-right" dir="rtl">
      <div className="relative mb-6">
        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <i className="fa-solid fa-[#E50914] fa-search text-red-500 text-lg"></i>
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن أي فيلم أو مسلسل لاختياره فوراً..." 
          className="w-full bg-[#111625]/90 backdrop-blur-xl border border-white/20 rounded-2xl pr-12 pl-4 py-4 text-white text-base focus:outline-none focus:border-[#E50914] focus:bg-[#161c2e] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] placeholder-gray-400 font-bold"
        />
        {isLoading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <div className="w-5 h-5 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 text-right max-h-[480px] overflow-y-auto p-1 custom-scrollbar">
          {results.map((item, idx) => (
            <div 
              key={`${item.nb}-${idx}`}
              onClick={() => handleSelectVideo(item)}
              className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:border-[#E50914] hover:bg-white/10 transition-all group hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(229,9,20,0.3)]"
            >
              <div className="relative aspect-[2/3] w-full bg-gray-900">
                <img 
                  src={getVideoImageUrl(item as any, 'poster')} 
                  alt={item.ar_title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-2 right-2 left-2 flex justify-between items-end">
                  <div className="bg-[#E50914] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                    {item.kind === '2' ? 'مسلسل' : 'فيلم'}
                  </div>
                  {item.stars && (
                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold font-en">
                      <span>{item.stars}</span>
                      <i className="fa-solid fa-star text-[9px]"></i>
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                  <div className="px-3 py-1.5 rounded-full bg-[#E50914] text-white font-black text-xs flex items-center gap-1.5 shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <i className="fa-solid fa-play text-[10px]"></i>
                    <span>اختر الآن</span>
                  </div>
                </div>
              </div>
              <div className="p-3 text-right">
                <h4 className="text-white text-xs font-black truncate leading-tight" title={item.ar_title}>{item.ar_title}</h4>
                <p className="text-gray-400 text-[10px] truncate mt-1 font-en" dir="ltr">{item.year || item.en_title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="text-center text-gray-400 py-10 bg-white/5 rounded-2xl border border-white/5">
          <i className="fa-solid fa-search text-3xl mb-2 opacity-40 text-red-500"></i>
          <p className="text-xs font-bold">لم يتم العثور على نتائج لـ "{query}"</p>
        </div>
      )}
    </div>
  );
}
