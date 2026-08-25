'use client';

import { getVideoImageUrl } from '@/utils/imageHelper';
import { decryptData } from '@/utils/cryptoHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Pagination from '@/components/Pagination';
import CardSkeleton from '@/components/skeleton/CardSkeleton';

interface VideoItem {
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
  type_name?: string;
  categories?: { ar_title: string }[];
}

const GENRES = [
  { nb: '', title: 'كل التصنيفات' },
  { nb: '84', title: 'أكشن' },
  { nb: '62', title: 'دراما' },
  { nb: '70', title: 'رعب' },
  { nb: '59', title: 'كوميدي' },
  { nb: '78', title: 'خيال علمي' },
  { nb: '60', title: 'جريمة' },
  { nb: '56', title: 'مغامرة' },
  { nb: '77', title: 'رومانسي' },
  { nb: '80', title: 'إثارة' },
  { nb: '76', title: 'غموض' },
  { nb: '61', title: 'وثائقي' }
];

const currentYear = new Date().getFullYear();
const allYearsRange = `1900,${currentYear}`;

const YEARS = [
  { value: allYearsRange, label: 'كل السنوات' },
  { value: `2020,${currentYear}`, label: `2020 - ${currentYear}` },
  { value: '2010,2019', label: '2010 - 2019' },
  { value: '2000,2009', label: '2000 - 2009' },
  { value: '1900,1999', label: 'قبل 2000' }
];

import MediaPosterImage from '@/components/MediaPosterImage';

function SearchPoster({ video }: { video: VideoItem }) {
  return (
    <MediaPosterImage
      video={video}
      type="poster"
      sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
      className="transition-transform duration-500 group-hover/card:scale-105"
    />
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Tab View: 'all' | 'movies' | 'series' (Pure Client State - 0 network delay, 0 flicker!)
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'series'>('all');

  // Filter States
  const [categoryId, setCategoryId] = useState('');
  const [yearRange, setYearRange] = useState(allYearsRange);
  const [starRating, setStarRating] = useState(''); // '5', '6', '7', '8', '9'

  // Dropdown UI States
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  
  const genreRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Data States
  const [rawMovies, setRawMovies] = useState<VideoItem[]>([]);
  const [rawSeries, setRawSeries] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setIsGenreOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setIsYearOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results when query, genre, year, star rating, or page change
  // Note: activeTab is NOT a dependency here, allowing instant 0ms switching!
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function performSearch() {
      setIsLoading(true);

      const queriesToTry = getMediaSearchQueryVariants(query);
      const categoryParam = categoryId ? `&category_id=${categoryId}` : '';
      const starParam = starRating ? `&star=${starRating}` : '';

      try {
        const startPage = (pageParam - 1) * 2;
        const pageIndices = [startPage, startPage + 1];

        const moviePromises = queriesToTry.flatMap((qTerm) => {
          const queryEncoded = encodeURIComponent(qTerm);
          return pageIndices.map((p) =>
            fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=2&videoTitle=${queryEncoded}&staffTitle=&page=${p}&year=${yearRange}&type=movies${categoryParam}${starParam}`,
              { signal }
            )
              .then((res) => (res.ok ? res.json() : null))
              .then((encrypted) => {
                if (!encrypted || !encrypted.payload) return [];
                const data = decryptData<VideoItem[]>(encrypted.payload);
                return Array.isArray(data) ? data : [];
              })
              .catch(() => [])
          );
        });

        const seriesPromises = queriesToTry.flatMap((qTerm) => {
          const queryEncoded = encodeURIComponent(qTerm);
          return pageIndices.map((p) =>
            fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=2&videoTitle=${queryEncoded}&staffTitle=&page=${p}&year=${yearRange}&type=series${categoryParam}${starParam}`,
              { signal }
            )
              .then((res) => (res.ok ? res.json() : null))
              .then((encrypted) => {
                if (!encrypted || !encrypted.payload) return [];
                const data = decryptData<VideoItem[]>(encrypted.payload);
                return Array.isArray(data) ? data : [];
              })
              .catch(() => [])
          );
        });

        const [movieLists, seriesLists] = await Promise.all([
          Promise.all(moviePromises),
          Promise.all(seriesPromises),
        ]);

        const uniqueMovies = rankMediaResults(dedupeMediaById(movieLists.flat()), query);
        const uniqueSeries = rankMediaResults(dedupeMediaById(seriesLists.flat()), query);

        if (!signal.aborted) {
          setRawMovies(uniqueMovies);
          setRawSeries(uniqueSeries);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Advanced Search failed:', error);
        if (!signal.aborted) {
          setRawMovies([]);
          setRawSeries([]);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (query.trim()) {
      void performSearch();
    } else {
      const resetFrame = window.requestAnimationFrame(() => {
        setRawMovies([]);
        setRawSeries([]);
        setIsLoading(false);
      });
      return () => {
        window.cancelAnimationFrame(resetFrame);
        controller.abort();
      };
    }

    return () => {
      controller.abort();
    };
  }, [query, categoryId, yearRange, starRating, pageParam]);

  const moviesCount = rawMovies.length;
  const seriesCount = rawSeries.length;
  const totalCount = moviesCount + seriesCount;

  const activeGenreTitle = GENRES.find((g) => g.nb === categoryId)?.title || 'كل التصنيفات';
  const activeYearLabel = YEARS.find((y) => y.value === yearRange)?.label || 'كل السنوات';
  const hasActiveFilters = Boolean(categoryId || yearRange !== allYearsRange || starRating);

  const resetAllFilters = () => {
    setCategoryId('');
    setYearRange(allYearsRange);
    setStarRating('');
    setActiveTab('all');
  };

  const hasNextPage = rawMovies.length >= 20 || rawSeries.length >= 20;

  const setPage = (pageNum: number) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('page', pageNum.toString());
      router.push(`${window.location.pathname}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStarClick = (rating: string) => {
    setStarRating((prev) => (prev === rating ? '' : rating));
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 lg:pt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32" dir="rtl">
      
      {/* Header */}
      <div className="mb-6 sm:mb-8 text-center relative">
        <h1 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tight">
          نتائج البحث عن: <span className="text-alex-primary drop-shadow-[0_0_15px_rgba(229,9,20,0.4)]">«{query}»</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm font-medium">
          {isLoading ? 'جاري البحث في المكتبة...' : `تم العثور على ${totalCount} نتيجة مطابقة`}
        </p>
      </div>

      {/* ADAPTIVE DYNAMIC CONTROL BAR */}
      <div className="mb-8 flex flex-col items-center gap-3">
        
        {/* Row 1: Primary Segmented Tab Switcher (Dynamic content-hugging pill) */}
        <div className="inline-flex items-center bg-[#0d1322]/90 border border-white/10 p-1 rounded-2xl shadow-lg w-fit max-w-full">
          
          {/* Tab: All */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none shrink-0 ${
              activeTab === 'all'
                ? 'bg-alex-primary text-white shadow-[0_2px_12px_rgba(229,9,20,0.5)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>الكل</span>
            {!isLoading && totalCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold ${
                activeTab === 'all' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                {totalCount}
              </span>
            )}
          </button>

          {/* Tab: Movies */}
          <button
            type="button"
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none shrink-0 ${
              activeTab === 'movies'
                ? 'bg-alex-primary text-white shadow-[0_2px_12px_rgba(229,9,20,0.5)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-film text-[10px] sm:text-xs"></i>
            <span>الأفلام</span>
            {!isLoading && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold ${
                activeTab === 'movies' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                {moviesCount}
              </span>
            )}
          </button>

          {/* Tab: Series */}
          <button
            type="button"
            onClick={() => setActiveTab('series')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none shrink-0 ${
              activeTab === 'series'
                ? 'bg-blue-600 text-white shadow-[0_2px_12px_rgba(37,99,235,0.5)] scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fa-solid fa-tv text-[10px] sm:text-xs"></i>
            <span>المسلسلات</span>
            {!isLoading && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold ${
                activeTab === 'series' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                {seriesCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Adaptive Fluid Filter Pills (Standalone, no bulky wrapper) */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-fit max-w-full">
          
          {/* Genres Dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              type="button"
              onClick={() => {
                setIsGenreOpen(!isGenreOpen);
                setIsYearOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 shadow-sm ${
                categoryId
                  ? 'bg-alex-primary/15 border-alex-primary/60 text-alex-primary'
                  : 'bg-[#0d1322]/80 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <i className="fa-solid fa-filter text-[10px] opacity-70"></i>
              <span>{activeGenreTitle}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isGenreOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isGenreOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-[#0c1220] border border-white/15 rounded-2xl shadow-2xl z-50 p-1.5 max-h-72 overflow-y-auto custom-scrollbar animate-fade-in">
                {GENRES.map((g) => (
                  <button
                    key={g.nb}
                    type="button"
                    onClick={() => {
                      setCategoryId(g.nb);
                      setIsGenreOpen(false);
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      categoryId === g.nb
                        ? 'bg-alex-primary text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{g.title}</span>
                    {categoryId === g.nb && <i className="fa-solid fa-check text-xs"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year Range Dropdown */}
          <div className="relative" ref={yearRef}>
            <button
              type="button"
              onClick={() => {
                setIsYearOpen(!isYearOpen);
                setIsGenreOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 shadow-sm ${
                yearRange !== allYearsRange
                  ? 'bg-alex-primary/15 border-alex-primary/60 text-alex-primary'
                  : 'bg-[#0d1322]/80 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <i className="fa-solid fa-calendar text-[10px] opacity-70"></i>
              <span>{activeYearLabel}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] transition-transform ${isYearOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isYearOpen && (
              <div className="absolute top-full right-0 mt-2 w-44 sm:w-52 bg-[#0c1220] border border-white/15 rounded-2xl shadow-2xl z-50 p-1.5 animate-fade-in">
                {YEARS.map((y) => (
                  <button
                    key={y.value}
                    type="button"
                    onClick={() => {
                      setYearRange(y.value);
                      setIsYearOpen(false);
                    }}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      yearRange === y.value
                        ? 'bg-alex-primary text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{y.label}</span>
                    {yearRange === y.value && <i className="fa-solid fa-check text-xs"></i>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stars Rating Filter - Pure Natural RTL (1st Star next to التقييم on right) */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d1322]/80 border border-white/10 rounded-xl shrink-0 shadow-sm">
            <span className="text-xs text-slate-300 font-bold">التقييم:</span>
            <div className="flex items-center gap-1">
              {[
                { val: '5', label: 'نجمة واحدة فأكثر' },
                { val: '6', label: 'نجمتان فأكثر' },
                { val: '7', label: '3 نجوم فأكثر' },
                { val: '8', label: '4 نجوم فأكثر' },
                { val: '9', label: '5 نجوم' },
              ].map((starItem) => {
                const selectedVal = starRating ? parseInt(starRating, 10) : 0;
                const starLevel = parseInt(starItem.val, 10);
                const isLit = selectedVal >= starLevel;

                return (
                  <button
                    key={starItem.val}
                    type="button"
                    onClick={() => handleStarClick(starItem.val)}
                    className={`p-0.5 text-sm sm:text-base transition-transform hover:scale-125 cursor-pointer ${
                      isLit ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]' : 'text-slate-600 hover:text-slate-400'
                    }`}
                    title={starItem.label}
                  >
                    <i className="fa-solid fa-star"></i>
                  </button>
                );
              })}
            </div>
            {starRating && (
              <button
                type="button"
                onClick={() => setStarRating('')}
                className="text-[10px] text-slate-400 hover:text-white bg-white/10 px-1.5 py-0.5 rounded cursor-pointer mr-0.5"
                title="إلغاء التقييم"
              >
                ✕
              </button>
            )}
          </div>

          {/* Reset Filters Pill */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-red-400 hover:text-red-300 font-bold px-2.5 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer shrink-0"
            >
              إعادة ضبط
            </button>
          )}

        </div>

      </div>

      {/* RESULTS DISPLAY */}
      {isLoading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-4 sm:gap-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : totalCount === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-[#0c1220]/60 border border-white/10 rounded-3xl text-center px-4">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-400 text-2xl">
            <i className="fa-solid fa-search"></i>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white mb-2">لا توجد نتائج مطابقة</h3>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-6">
            لم نتمكن من العثور على محتوى يطابق خيارات التصفية المحددة.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-5 py-2.5 rounded-xl bg-alex-primary hover:bg-[#b8070f] text-white font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer"
            >
              إعادة تعيين جميع الفلاتر
            </button>
          )}
        </div>
      ) : (
        /* Results Grid */
        <div className="space-y-12">
          
          {/* SECTION: MOVIES */}
          {(activeTab === 'all' || activeTab === 'movies') && moviesCount > 0 && (
            <div className="space-y-4">
              {activeTab === 'all' && (
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-5 rounded-full bg-alex-primary shadow-[0_0_8px_rgba(229,9,20,0.6)]"></span>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>الأفلام المطابقة</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-alex-primary/20 text-alex-primary border border-alex-primary/30">
                        {moviesCount}
                      </span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('movies')}
                    className="text-xs font-bold text-slate-400 hover:text-alex-primary transition-colors cursor-pointer"
                  >
                    عرض الكل ←
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-5">
                {rawMovies.map((video) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                    className="group/card block relative cursor-pointer"
                  >
                    <div className="aspect-[2/3] w-full relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-md group-hover/card:shadow-[0_8px_25px_rgba(229,9,20,0.3)] group-hover/card:border-alex-primary/40 transition-all duration-300">
                      <SearchPoster video={video} />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover/card:opacity-90 transition-opacity"></div>

                      {/* IMDb Badge */}
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <span className="text-amber-400 text-[9px] font-black font-en">IMDb</span>
                        <span className="text-white text-[10px] font-bold font-en">{video.stars}</span>
                      </div>

                      {/* Play Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-12 h-12 rounded-full bg-alex-primary flex items-center justify-center text-white shadow-xl">
                          <i className="fa-solid fa-play ml-0.5 text-lg"></i>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-200 group-hover/card:text-white transition-colors truncate" dir="auto" title={video.ar_title}>
                        {video.ar_title}
                      </h3>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                        <span className="bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[10px] text-slate-300">
                          {video.type_name || video.categories?.[0]?.ar_title || 'فيلم'}
                        </span>
                        <span className="font-en font-semibold">{video.year}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: SERIES */}
          {(activeTab === 'all' || activeTab === 'series') && seriesCount > 0 && (
            <div className="space-y-4">
              {activeTab === 'all' && (
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>المسلسلات المطابقة</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {seriesCount}
                      </span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('series')}
                    className="text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    عرض الكل ←
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-5">
                {rawSeries.map((video) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                    className="group/card block relative cursor-pointer"
                  >
                    <div className="aspect-[2/3] w-full relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-md group-hover/card:shadow-[0_8px_25px_rgba(59,130,246,0.3)] group-hover/card:border-blue-500/40 transition-all duration-300">
                      <SearchPoster video={video} />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover/card:opacity-90 transition-opacity"></div>

                      {/* IMDb Badge */}
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-white/10 px-1.5 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <span className="text-amber-400 text-[9px] font-black font-en">IMDb</span>
                        <span className="text-white text-[10px] font-bold font-en">{video.stars}</span>
                      </div>

                      {/* Play Hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-75 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xl">
                          <i className="fa-solid fa-play ml-0.5 text-lg"></i>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 px-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-200 group-hover/card:text-white transition-colors truncate" dir="auto" title={video.ar_title}>
                        {video.ar_title}
                      </h3>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                        <span className="bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[10px] text-slate-300">
                          {video.type_name || video.categories?.[0]?.ar_title || 'مسلسل'}
                        </span>
                        <span className="font-en font-semibold">{video.year}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          <Pagination 
            currentPage={pageParam} 
            onPageChange={setPage} 
            hasNextPage={hasNextPage} 
            accentColor="primary" 
          />

        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-32 max-w-7xl mx-auto px-4 text-center text-slate-400 font-bold">
        جاري تحميل نتائج البحث...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
