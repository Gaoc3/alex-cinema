'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { decryptData } from '@/utils/cryptoHelper';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';
import toast from 'react-hot-toast';

interface SearchResult {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  imgObjUrl?: string;
  imgMediumThumb?: string;
  imgThumb?: string;
  kind?: string;
}

interface LobbySearchProps {
  roomId: string;
  onVideoSelected?: (videoId: string, kind?: string) => Promise<{ ok: boolean; error?: string }>;
}

const allYearsRange = `1900,${new Date().getFullYear()}`;

import MediaPosterImage from '@/components/MediaPosterImage';

function LobbyPoster({ item }: { item: SearchResult }) {
  return (
    <MediaPosterImage
      video={item}
      type="poster"
      sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
      className="transition-transform duration-500 group-hover:scale-105"
    />
  );
}

export default function LobbySearch({ roomId, onVideoSelected }: LobbySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) return;

    const controller = new AbortController();
    const { signal } = controller;

    debounceTimer.current = setTimeout(async () => {
      try {
        const queriesToTry = getMediaSearchQueryVariants(query);

        const combinedResults: SearchResult[] = [];

        for (const qTerm of queriesToTry) {
          const queryEncoded = encodeURIComponent(qTerm);
          const [resMovies, resSeries] = await Promise.all([
            fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=movies`, { signal }),
            fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=series`, { signal })
          ]);

          let moviesList: SearchResult[] = [];
          let seriesList: SearchResult[] = [];

          if (resMovies.ok) {
            const encrypted_data = await resMovies.json();
            const data: unknown = decryptData(encrypted_data.payload);
            moviesList = Array.isArray(data) ? data as SearchResult[] : [];
          }
          if (resSeries.ok) {
            const encrypted_data = await resSeries.json();
            const data: unknown = decryptData(encrypted_data.payload);
            seriesList = Array.isArray(data) ? data as SearchResult[] : [];
          }

          combinedResults.push(
            ...moviesList.map((item) => ({ ...item, kind: item.kind || '1' })),
            ...seriesList.map((item) => ({ ...item, kind: item.kind || '2' })),
          );
        }

        const sorted = rankMediaResults(dedupeMediaById(combinedResults), query);

        if (!signal.aborted) {
          setResults(sorted.slice(0, 18));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setResults([]);
    if (value.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  };

  const handleSelectVideo = async (item: SearchResult) => {
    setIsLoading(true);
    try {
      const { updateRoomVideo } = await import('@/app/actions/room.actions');
      const res = await updateRoomVideo(roomId, {
        movieId: item.nb,
        movieTitle: item.ar_title || item.en_title || '',
        moviePoster: item.img || ''
      });
      if (res.success) {
        const syncResult = onVideoSelected
          ? await onVideoSelected(item.nb, item.kind || '')
          : { ok: true };
        toast.success(`تم اختيار ${item.ar_title || item.en_title} للروم! 🎬`);
        const nextUrl = `/room/${roomId}?videoId=${item.nb}`;
        if (!syncResult.ok) {
          toast('سيُعاد الاتصال بالغرفة لإكمال المزامنة', { icon: '🔄' });
          window.location.assign(nextUrl);
        } else {
          router.push(nextUrl);
        }
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
    <div className="mx-auto w-full max-w-5xl text-right" dir="rtl">
      <div className="relative mb-4">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <i className="fa-solid fa-search text-sm text-red-400" aria-hidden="true" />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="ابحث عن فيلم أو مسلسل..."
          aria-label="البحث عن محتوى للغرفة"
          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.055] py-3 pl-12 pr-11 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10"
        />
        {isLoading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <div className="size-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" role="status" aria-label="جارٍ البحث" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="custom-scrollbar grid max-h-[min(58svh,32rem)] grid-cols-2 gap-3 overflow-y-auto p-1 text-right sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {results.map((item) => (
            <button
              type="button"
              key={item.nb}
              onClick={() => void handleSelectVideo(item)}
              className="group min-w-0 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-right transition hover:-translate-y-0.5 hover:border-red-500/60 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label={`اختيار ${item.ar_title || item.en_title}`}
            >
              <div className="relative aspect-[2/3] w-full bg-gray-900">
                <LobbyPoster item={item} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-2 right-2 left-2 flex justify-between items-end">
                  <div className="rounded-md bg-[#e50914] px-2 py-0.5 text-[9px] font-black text-white">
                    {item.kind === '2' ? 'مسلسل' : 'فيلم'}
                  </div>
                  {item.stars && (
                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold font-en">
                      <span>{item.stars}</span>
                      <i className="fa-solid fa-star text-[9px]"></i>
                    </div>
                  )}
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <div className="flex min-h-10 items-center gap-1.5 rounded-full bg-[#e50914] px-3 text-xs font-black text-white shadow-lg transition-transform duration-300">
                    <i className="fa-solid fa-play text-[10px]"></i>
                    <span>اختر الآن</span>
                  </div>
                </div>
              </div>
              <div className="p-2.5 text-right">
                <h4 className="truncate text-xs font-black leading-5 text-white" title={item.ar_title}>{item.ar_title}</h4>
                <p className="mt-0.5 truncate text-[10px] text-slate-400" dir="ltr">{item.year || item.en_title}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] py-8 text-center text-slate-400">
          <i className="fa-solid fa-search mb-2 text-xl text-slate-500" aria-hidden="true" />
          <p className="text-xs font-bold">لا توجد نتائج لـ «{query}»</p>
        </div>
      )}
    </div>
  );
}
