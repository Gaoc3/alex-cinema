'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decryptData } from '@/utils/cryptoHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';
import MediaPosterImage from '@/components/MediaPosterImage';
import toast from 'react-hot-toast';

export interface SearchResult {
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
  onClose?: () => void;
}

const allYearsRange = `1900,${new Date().getFullYear()}`;

export default function LobbySearch({ roomId, onVideoSelected, onClose }: LobbySearchProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movies' | 'series'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load VIP Curated suggestions on mount
  useEffect(() => {
    const controller = new AbortController();
    const loadSuggestions = async () => {
      try {
        const res = await fetch(
          `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=&staffTitle=&page=0&year=2024,2026&type=movies`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const encrypted = await res.json();
          const data: unknown = decryptData(encrypted.payload);
          if (Array.isArray(data)) {
            setSuggestions(dedupeMediaById(data as SearchResult[]).slice(0, 12));
          }
        }
      } catch {
        // Fallback silently if aborted or network issue
      }
    };
    loadSuggestions();
    return () => controller.abort();
  }, []);

  // Debounced search query
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
            fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=movies`,
              { signal }
            ),
            fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=series`,
              { signal }
            ),
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
            ...seriesList.map((item) => ({ ...item, kind: item.kind || '2' }))
          );
        }

        const sorted = rankMediaResults(dedupeMediaById(combinedResults), query);

        if (!signal.aborted) {
          setResults(sorted.slice(0, 30));
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, 300);

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

  const handleSelectVideo = useCallback(
    async (item: SearchResult) => {
      if (selectedId) return;
      setSelectedId(item.nb);
      setIsLoading(true);
      try {
        const { updateRoomVideo } = await import('@/app/actions/room.actions');
        const res = await updateRoomVideo(roomId, {
          movieId: item.nb,
          movieTitle: item.ar_title || item.en_title || '',
          moviePoster: item.img || item.imgObjUrl || item.imgMediumThumb || '',
        });
        if (res.success) {
          const syncResult = onVideoSelected
            ? await onVideoSelected(item.nb, item.kind || '')
            : { ok: true };
          toast.success(`تم اختيار «${item.ar_title || item.en_title}» للعرض! 🎬`);
          if (onClose) onClose();

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
    },
    [roomId, onVideoSelected, onClose, router, selectedId]
  );

  return (
    <div className="w-full text-right" dir="rtl">
      {/* Search Input Bar */}
      <div className="relative mx-auto mb-4 max-w-2xl">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <i className="fa-solid fa-magnifying-glass text-sm text-red-500 transition-colors" aria-hidden="true" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم العربي أو الإنجليزي أو اسم الممثل..."
          aria-label="البحث عن فيلم أو مسلسل"
          className="min-h-12 w-full rounded-2xl border border-white/15 bg-[#080d18]/90 py-3.5 pl-12 pr-11 text-sm font-bold text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-300 placeholder:text-slate-500 focus:border-red-500/80 focus:bg-[#0b1222] focus:ring-4 focus:ring-red-500/20"
        />
        {query.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              searchInputRef.current?.focus();
            }}
            className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="مسح البحث"
          >
            <i className="fa-solid fa-circle-xmark text-sm" />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <div
              className="size-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent"
              role="status"
              aria-label="جارٍ البحث"
            />
          </div>
        )}
      </div>

      {/* Filter Tabs (When results exist) */}
      {results.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              filterType === 'all'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/35 scale-105'
                : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            الكل ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('movies')}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              filterType === 'movies'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/35 scale-105'
                : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            🎬 أفلام ({results.filter((r) => r.kind !== '2').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('series')}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              filterType === 'series'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/35 scale-105'
                : 'border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            📺 مسلسلات ({results.filter((r) => r.kind === '2').length})
          </button>
        </div>
      )}

      {/* Search Results Grid */}
      {filteredResults.length > 0 && (
        <div className="custom-scrollbar grid w-full max-h-[min(58svh,34rem)] grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-1 pb-8 text-right overflow-y-auto">
          {filteredResults.map((item) => {
            const isSelectingThis = selectedId === item.nb;
            return (
              <button
                type="button"
                key={item.nb}
                disabled={Boolean(selectedId)}
                onClick={() => void handleSelectVideo(item)}
                className={`group relative min-w-0 cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] text-right transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_16px_40px_rgba(229,9,20,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                  isSelectingThis
                    ? 'border-red-500 ring-2 ring-red-500 shadow-[0_0_30px_rgba(229,9,20,0.5)]'
                    : 'border-white/10 hover:border-red-500/80'
                }`}
                aria-label={`اختيار ${item.ar_title || item.en_title}`}
              >
                <div className="relative aspect-[2/3] w-full bg-[#0a0f1d] overflow-hidden">
                  <MediaPosterImage
                    video={item}
                    type="poster"
                    sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                    className="transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between z-10">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-black backdrop-blur-md border ${
                        item.kind === '2'
                          ? 'bg-purple-600/80 border-purple-400/40 text-white'
                          : 'bg-red-600/80 border-red-400/40 text-white'
                      }`}
                    >
                      {item.kind === '2' ? 'مسلسل' : 'فيلم'}
                    </span>
                    {item.stars && (
                      <span className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-amber-300">
                        <span>{item.stars}</span>
                        <i className="fa-solid fa-star text-[9px] text-amber-400" />
                      </span>
                    )}
                  </div>

                  {/* Neon Glowing Play Button on Hover */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-[0_0_25px_rgba(229,9,20,0.8)] ring-4 ring-red-500/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                      {isSelectingThis ? (
                        <i className="fa-solid fa-spinner fa-spin text-base" />
                      ) : (
                        <i className="fa-solid fa-play text-base mr-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Title & Info */}
                <div className="p-3 text-right">
                  <h4
                    className="truncate text-xs font-black leading-snug text-white group-hover:text-red-400 transition-colors"
                    title={item.ar_title}
                  >
                    {item.ar_title}
                  </h4>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-400" dir="ltr">
                    <span className="truncate">{item.en_title || ''}</span>
                    {item.year && <span className="shrink-0 text-slate-500 font-bold ml-1">{item.year}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* VIP Suggestions Grid (When search is empty) */}
      {query.trim().length < 2 && suggestions.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between px-1 mb-3">
            <span className="flex items-center gap-2 text-xs font-black text-white">
              <span className="flex size-6 items-center justify-center rounded-lg bg-red-600/20 text-red-500 border border-red-500/30">
                <i className="fa-solid fa-fire text-xs" aria-hidden="true" />
              </span>
              <span>الأكثر طلباً للمشاهدة الجماعية 🔥</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">اختر للبدء فوراً لجميع المشاركين</span>
          </div>

          <div className="custom-scrollbar grid w-full max-h-[min(54svh,32rem)] grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-1 pb-8 text-right overflow-y-auto">
            {suggestions.map((item) => {
              const isSelectingThis = selectedId === item.nb;
              return (
                <button
                  type="button"
                  key={item.nb}
                  disabled={Boolean(selectedId)}
                  onClick={() => void handleSelectVideo(item)}
                  className={`group relative min-w-0 cursor-pointer overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.06] to-white/[0.02] text-right transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_16px_40px_rgba(229,9,20,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    isSelectingThis
                      ? 'border-red-500 ring-2 ring-red-500 shadow-[0_0_30px_rgba(229,9,20,0.5)]'
                      : 'border-white/10 hover:border-red-500/80'
                  }`}
                  aria-label={`اختيار ${item.ar_title || item.en_title}`}
                >
                  <div className="relative aspect-[2/3] w-full bg-[#0a0f1d] overflow-hidden">
                    <MediaPosterImage
                      video={item}
                      type="poster"
                      sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                      className="transition-transform duration-500 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between z-10">
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-black backdrop-blur-md border ${
                          item.kind === '2'
                            ? 'bg-purple-600/80 border-purple-400/40 text-white'
                            : 'bg-red-600/80 border-red-400/40 text-white'
                        }`}
                      >
                        {item.kind === '2' ? 'مسلسل' : 'فيلم'}
                      </span>
                      {item.stars && (
                        <span className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-black text-amber-300">
                          <span>{item.stars}</span>
                          <i className="fa-solid fa-star text-[9px] text-amber-400" />
                        </span>
                      )}
                    </div>

                    {/* Neon Glowing Play Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-red-500 text-white shadow-[0_0_25px_rgba(229,9,20,0.8)] ring-4 ring-red-500/20 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                        {isSelectingThis ? (
                          <i className="fa-solid fa-spinner fa-spin text-base" />
                        ) : (
                          <i className="fa-solid fa-play text-base mr-0.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Title & Info */}
                  <div className="p-3 text-right">
                    <h4
                      className="truncate text-xs font-black leading-snug text-white group-hover:text-red-400 transition-colors"
                      title={item.ar_title}
                    >
                      {item.ar_title}
                    </h4>
                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-slate-400" dir="ltr">
                      <span className="truncate">{item.en_title || ''}</span>
                      {item.year && <span className="shrink-0 text-slate-500 font-bold ml-1">{item.year}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State when no results found */}
      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] py-12 px-6 text-center backdrop-blur-md">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-400 text-xl">
            <i className="fa-solid fa-film" aria-hidden="true" />
          </div>
          <p className="text-base font-black text-white mb-1">لم نعثر على أي عمل يطابق «{query}»</p>
          <p className="text-xs font-medium text-slate-400">تأكد من كتابة الاسم بشكل صحيح أو جرب البحث بكلمة أو تصنيف آخر.</p>
        </div>
      )}
    </div>
  );
}
