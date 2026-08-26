'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { decryptData } from '@/utils/cryptoHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';
import MediaPosterImage from '@/components/MediaPosterImage';
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

export default function LobbySearch({ roomId, onVideoSelected }: LobbySearchProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movies' | 'series'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setIsLoading(true);

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
            moviesList = Array.isArray(data) ? (data as SearchResult[]) : [];
          }
          if (resSeries.ok) {
            const encrypted_data = await resSeries.json();
            const data: unknown = decryptData(encrypted_data.payload);
            seriesList = Array.isArray(data) ? (data as SearchResult[]) : [];
          }

          combinedResults.push(
            ...moviesList.map((item) => ({ ...item, kind: item.kind || '1' })),
            ...seriesList.map((item) => ({ ...item, kind: item.kind || '2' })),
          );
        }

        const sorted = rankMediaResults(dedupeMediaById(combinedResults), query);

        if (!signal.aborted) {
          setResults(sorted.slice(0, 24));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [query]);

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return results;
    if (filterType === 'movies') return results.filter((item) => item.kind !== '2');
    if (filterType === 'series') return results.filter((item) => item.kind === '2');
    return results;
  }, [results, filterType]);

  const handleSelectVideo = async (item: SearchResult) => {
    setSelectedId(item.nb);
    setIsLoading(true);
    try {
      const { updateRoomVideo } = await import('@/app/actions/room.actions');
      const res = await updateRoomVideo(roomId, {
        movieId: item.nb,
        movieTitle: item.ar_title || item.en_title || '',
        moviePoster: item.img || item.imgObjUrl || item.imgMediumThumb || ''
      });
      if (res.success) {
        const syncResult = onVideoSelected
          ? await onVideoSelected(item.nb, item.kind || '')
          : { ok: true };
        toast.success(`تم اختيار «${item.ar_title || item.en_title}» للعرض! 🎬`);
        const nextUrl = `/room/${roomId}?videoId=${item.nb}`;
        if (!syncResult.ok) {
          toast('سيُعاد الاتصال بالغرفة لإكمال المزامنة', { icon: '🔄' });
          window.location.assign(nextUrl);
        } else {
          router.push(nextUrl);
        }
      } else {
        toast.error(res.error || 'حدث خطأ أثناء اختيار الفيديو للغرفة');
      }
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  return (
    <div className="w-full text-right" dir="rtl">
      {/* Search Input Bar */}
      <div className="relative mx-auto mb-3 max-w-xl">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <i className="fa-solid fa-magnifying-glass text-sm text-red-500 transition-colors" aria-hidden="true" />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن اسم فيلم، مسلسل، أو شخصية..."
          aria-label="البحث عن محتوى للغرفة"
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-black/40 py-3 pl-12 pr-11 text-sm font-bold text-white shadow-inner backdrop-blur-md transition-all duration-300 placeholder:text-slate-500 focus:border-red-500 focus:bg-black/60 focus:ring-4 focus:ring-red-500/15"
        />
        {query.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="مسح البحث"
          >
            <i className="fa-solid fa-circle-xmark text-sm" />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <div className="size-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" role="status" aria-label="جارٍ البحث" />
          </div>
        )}
      </div>

      {/* Filter Chips (Visible when results exist) */}
      {results.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              filterType === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            الكل ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('movies')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              filterType === 'movies'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            أفلام ({results.filter(r => r.kind !== '2').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('series')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              filterType === 'series'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
            }`}
          >
            مسلسلات ({results.filter(r => r.kind === '2').length})
          </button>
        </div>
      )}

      {/* Results Grid */}
      {filteredResults.length > 0 && (
        <div className="custom-scrollbar grid w-full max-h-[min(56svh,32rem)] grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 p-1 text-right overflow-y-auto">
          {filteredResults.map((item) => {
            const isSelectingThis = selectedId === item.nb;
            return (
              <button
                type="button"
                key={item.nb}
                disabled={Boolean(selectedId)}
                onClick={() => void handleSelectVideo(item)}
                className={`group relative min-w-0 cursor-pointer overflow-hidden rounded-2xl border bg-white/[0.03] text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(229,9,20,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                  isSelectingThis ? 'border-red-500 ring-2 ring-red-500' : 'border-white/10 hover:border-red-500/60'
                }`}
                aria-label={`اختيار ${item.ar_title || item.en_title}`}
              >
                <div className="relative aspect-[2/3] w-full bg-[#0d121d] overflow-hidden">
                  <MediaPosterImage
                    video={item}
                    type="poster"
                    sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                  
                  {/* Badges */}
                  <div className="absolute bottom-2.5 right-2.5 left-2.5 flex justify-between items-center z-10">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      item.kind === '2' ? 'bg-purple-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {item.kind === '2' ? 'مسلسل' : 'فيلم'}
                    </span>
                    {item.stars && (
                      <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-md text-amber-400 text-[11px] font-bold font-en border border-amber-400/20">
                        <span>{item.stars}</span>
                        <i className="fa-solid fa-star text-[9px]" />
                      </span>
                    )}
                  </div>
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex size-11 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-600/40 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      {isSelectingThis ? (
                        <i className="fa-solid fa-spinner fa-spin text-sm" />
                      ) : (
                        <i className="fa-solid fa-play text-sm mr-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Title & Info */}
                <div className="p-3 text-right">
                  <h4 className="truncate text-xs font-black leading-tight text-white group-hover:text-red-400 transition-colors" title={item.ar_title}>
                    {item.ar_title}
                  </h4>
                  <p className="mt-1 truncate text-[10px] font-medium text-slate-400" dir="ltr">
                    {item.year || item.en_title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State when no results found */}
      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] py-10 px-6 text-center backdrop-blur-md">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 text-lg">
            <i className="fa-solid fa-film" aria-hidden="true" />
          </div>
          <p className="text-sm font-black text-white mb-1">لم نعثر على أي عمل يطابق «{query}»</p>
          <p className="text-xs text-slate-400">تأكد من كتابة الاسم بشكل صحيح أو جرب البحث بكلمة مختلفة.</p>
        </div>
      )}
    </div>
  );
}
