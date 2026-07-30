'use client';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { decryptData } from '@/utils/cryptoHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  { nb: '', title: 'الكل' },
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

function SearchPoster({ video }: { video: VideoItem }) {
  const [imgFailed, setImgFailed] = useState(false);
  const poster = getVideoImageUrl(video, 'poster');
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(video.ar_title || video.en_title || '?')}`;

  return (
    <Image
      src={!imgFailed && poster ? poster : fallback}
      alt={video.ar_title || video.en_title || 'ملصق المحتوى'}
      fill
      sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
      unoptimized
      className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
      onError={() => setImgFailed(true)}
    />
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [yearRange, setYearRange] = useState(allYearsRange);
  const [starRating, setStarRating] = useState(''); // 5 (>=5), 6 (>=6), etc.

  // UI Dropdowns
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  
  const genreRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Data States
  const [movies, setMovies] = useState<VideoItem[]>([]);
  const [series, setSeries] = useState<VideoItem[]>([]);
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

  // Fetch search results when query or filters change
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function performSearch() {
      setIsLoading(true);

      const queriesToTry = getMediaSearchQueryVariants(query);

      const categoryParam = categoryId ? `&category_id=${categoryId}` : '';
      const starParam = starRating ? `&star=${starRating}` : '';

      try {
        const fetchMovies = typeFilter === 'all' || typeFilter === 'movies';
        const fetchSeries = typeFilter === 'all' || typeFilter === 'series';

        const allFetchedMovies: VideoItem[] = [];
        const allFetchedSeries: VideoItem[] = [];

        for (const qTerm of queriesToTry) {
          const queryEncoded = encodeURIComponent(qTerm);

          let moviesPromise = Promise.resolve<VideoItem[]>([]);
          let seriesPromise = Promise.resolve<VideoItem[]>([]);

          if (fetchMovies) {
            moviesPromise = fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=${pageParam - 1}&year=${yearRange}&type=movies${categoryParam}${starParam}`,
              { signal }
            )
              .then((res) => (res.ok ? res.json() : null))
              .then((encrypted) => {
                if (!encrypted || !encrypted.payload) return [];
                const data = decryptData<VideoItem[]>(encrypted.payload);
                return Array.isArray(data) ? data : [];
              });
          }

          if (fetchSeries) {
            seriesPromise = fetch(
              `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=${pageParam - 1}&year=${yearRange}&type=series${categoryParam}${starParam}`,
              { signal }
            )
              .then((res) => (res.ok ? res.json() : null))
              .then((encrypted) => {
                if (!encrypted || !encrypted.payload) return [];
                const data = decryptData<VideoItem[]>(encrypted.payload);
                return Array.isArray(data) ? data : [];
              });
          }

          const [mList, sList] = await Promise.all([moviesPromise, seriesPromise]);
          allFetchedMovies.push(...mList);
          allFetchedSeries.push(...sList);
        }

        // Deduplicate items by nb ID
        const uniqueMovies = rankMediaResults(dedupeMediaById(allFetchedMovies), query);
        const uniqueSeries = rankMediaResults(dedupeMediaById(allFetchedSeries), query);

        if (!signal.aborted) {
          setMovies(uniqueMovies);
          setSeries(uniqueSeries);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Advanced Search failed:', error);
        if (!signal.aborted) {
          setMovies([]);
          setSeries([]);
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
        setMovies([]);
        setSeries([]);
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
  }, [query, typeFilter, categoryId, yearRange, starRating, pageParam]);

  const activeGenreTitle = GENRES.find((g) => g.nb === categoryId)?.title || 'الكل';
  const activeYearLabel = YEARS.find((y) => y.value === yearRange)?.label || 'الكل';
  const totalResults = (typeFilter === 'all' || typeFilter === 'movies' ? movies.length : 0) + 
                       (typeFilter === 'all' || typeFilter === 'series' ? series.length : 0);

  const hasNextPage = movies.length >= 12 || series.length >= 12;

  const setPage = (pageNum: number) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('page', pageNum.toString());
      router.push(`${window.location.pathname}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Stars Click handler
  const handleStarClick = (rating: string) => {
    if (starRating === rating) {
      setStarRating(''); // Reset
    } else {
      setStarRating(rating);
    }
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 lg:pt-32 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 animate-fade-in-up" dir="rtl">
      
      {/* Page Header */}
      <div className="mb-10 text-center relative">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-alex-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 drop-shadow-md break-words">
          نتائج البحث عن: <span className="text-alex-primary tracking-tight break-all">«{query}»</span>
        </h1>
        <p className="text-gray-400 font-medium">
          تم العثور على {isLoading ? '...' : totalResults} نتيجة مطابقة
        </p>
      </div>

      {/* ADVANCED FILTER BAR */}
      <div className="mb-8 sm:mb-14 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-6 glass-panel p-3 sm:p-4 rounded-2xl shadow-xl select-none relative z-50">
        
        {/* Right side: Type toggles and Dropdowns */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Movies / Series Toggle Button Pill */}
          <div className="flex bg-black/30 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-inner">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setTypeFilter('movies')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'movies' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              الأفلام
            </button>
            <button
              onClick={() => setTypeFilter('series')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'series' ? 'bg-white text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              المسلسلات
            </button>
          </div>

          {/* Genres Dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setIsGenreOpen(!isGenreOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-black/30 backdrop-blur-md border rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer ${
                categoryId ? 'border-alex-primary/30 text-alex-primary' : 'border-white/5'
              }`}
            >
              <i className="fa-solid fa-filter text-gray-500"></i>
              <span>الأنواع: {activeGenreTitle}</span>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isGenreOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isGenreOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 liquid-glass-heavy rounded-2xl shadow-2xl z-50 flex flex-col p-1.5 max-h-72 overflow-y-auto custom-scrollbar">
                {GENRES.map((g) => (
                  <button
                    key={g.nb}
                    onClick={() => {
                      setCategoryId(g.nb);
                      setIsGenreOpen(false);
                    }}
                    className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all ${
                      categoryId === g.nb ? 'bg-alex-primary text-white' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year Range Dropdown */}
          <div className="relative" ref={yearRef}>
            <button
              onClick={() => setIsYearOpen(!isYearOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-black/30 backdrop-blur-md border rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer ${
                yearRange !== allYearsRange ? 'border-alex-primary/30 text-alex-primary' : 'border-white/5'
              }`}
            >
              <i className="fa-solid fa-calendar text-gray-500"></i>
              <span>سنة: {activeYearLabel}</span>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isYearOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isYearOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 liquid-glass-heavy rounded-2xl shadow-2xl z-50 flex flex-col p-1.5">
                {YEARS.map((y) => (
                  <button
                    key={y.value}
                    onClick={() => {
                      setYearRange(y.value);
                      setIsYearOpen(false);
                    }}
                    className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all ${
                      yearRange === y.value ? 'bg-alex-primary text-white' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {y.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Left side: Stars Rating Filter */}
        <div className="flex flex-wrap items-center gap-2.5 bg-black/30 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-white/5 shadow-inner">
          <span className="text-xs text-gray-500 font-bold">التقييم:</span>
          <div className="flex flex-row-reverse items-center gap-1">
            {[9, 8, 7, 6, 5].map((ratingVal) => {
              const strRating = ratingVal.toString();
              const isHighlighted = starRating && parseInt(starRating) <= ratingVal;
              return (
                <button
                  key={ratingVal}
                  onClick={() => handleStarClick(strRating)}
                  className={`text-base transition-colors hover:scale-115 cursor-pointer ${
                    isHighlighted ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-500'
                  }`}
                  title={`تقييم أكبر من أو يساوي ${ratingVal}`}
                >
                  <i className="fa-solid fa-star"></i>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* RESULTS DISPLAY */}
      {isLoading ? (
        /* Skeleton Loader Grid */
        <div className="space-y-16">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : totalResults === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 ios-glass rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0e17]/80"></div>
          <i className="fa-solid fa-search text-6xl text-gray-700 mb-6 drop-shadow-lg relative z-10 animate-pulse"></i>
          <h2 className="text-3xl font-black text-gray-400 mb-2 relative z-10">لا توجد نتائج مطابقة لتصفيتك</h2>
          <p className="text-gray-500 mb-8 relative z-10">حاول تغيير خيارات التصفية أو البحث بكلمات أخرى.</p>
          <button
            onClick={() => {
              setCategoryId('');
              setYearRange(allYearsRange);
              setStarRating('');
              setTypeFilter('all');
            }}
            className="btn-primary px-8 py-3.5 rounded-xl text-white font-bold shadow-lg hover-scale relative z-10 cursor-pointer"
          >
            إعادة تعيين المرشحات
          </button>
        </div>
      ) : (
        <div className="space-y-20">
          
          {/* MOVIES SECTION */}
          {(typeFilter === 'all' || typeFilter === 'movies') && movies.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                <div className="w-1.5 h-7 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
                الأفلام المطابقة ({movies.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {movies.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                    className="group/card block relative snap-start cursor-pointer"
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper shadow-lg group-hover/card:shadow-[0_10px_30px_rgba(229,9,20,0.2)] transition-shadow duration-500">
                      <SearchPoster video={video} />
                      <div className="movie-card-overlay"></div>

                      {/* IMDb Badge on Poster */}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1 z-10 shadow-md">
                        <span className="text-yellow-500 text-[9px] font-black font-en tracking-wider">IMDb</span>
                        <span className="text-white text-[11px] font-bold font-en">{video.stars}</span>
                      </div>

                      {/* Play Hover Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-14 h-14 rounded-full bg-alex-primary/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] backdrop-blur-md">
                          <i className="fa-solid fa-play ml-1 text-xl"></i>
                        </div>
                      </div>
                    </div>

                    {/* Info Details directly below the poster */}
                    <div className="mt-3 px-1">
                      <h3 className="text-sm font-bold text-gray-200 group-hover/card:text-white transition-colors truncate leading-tight text-start" dir="auto" title={video.ar_title}>
                        {video.ar_title}
                      </h3>

                      <div className="flex items-center justify-between mt-1.5 opacity-70 group-hover/card:opacity-100 transition-opacity">
                        <span className="font-cairo bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-300">{video.type_name || video.categories?.[0]?.ar_title || 'فيلم'}</span>
                        <span className="font-en text-[11px] font-bold text-gray-400">{video.year}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* SERIES SECTION */}
          {(typeFilter === 'all' || typeFilter === 'series') && series.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                <div className="w-1.5 h-7 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                المسلسلات المطابقة ({series.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {series.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                    className="group/card block relative snap-start cursor-pointer"
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper shadow-lg group-hover/card:shadow-[0_10px_30px_rgba(59,130,246,0.2)] transition-shadow duration-500">
                      <SearchPoster video={video} />
                      <div className="movie-card-overlay"></div>

                      {/* IMDb Badge on Poster */}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1 z-10 shadow-md">
                        <span className="text-yellow-500 text-[9px] font-black font-en tracking-wider">IMDb</span>
                        <span className="text-white text-[11px] font-bold font-en">{video.stars}</span>
                      </div>

                      {/* Play Hover Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-14 h-14 rounded-full bg-blue-500/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] backdrop-blur-md">
                          <i className="fa-solid fa-play ml-1 text-xl"></i>
                        </div>
                      </div>
                    </div>

                    {/* Info Details directly below the poster */}
                    <div className="mt-3 px-1">
                      <h3 className="text-sm font-bold text-gray-200 group-hover/card:text-white transition-colors truncate leading-tight text-start" dir="auto" title={video.ar_title}>
                        {video.ar_title}
                      </h3>

                      <div className="flex items-center justify-between mt-1.5 opacity-70 group-hover/card:opacity-100 transition-opacity">
                        <span className="font-cairo bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-gray-300">{video.type_name || video.categories?.[0]?.ar_title || 'مسلسل'}</span>
                        <span className="font-en text-[11px] font-bold text-gray-400">{video.year}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pagination Controls */}
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
      <div className="min-h-screen pt-32 max-w-screen-2xl mx-auto px-4 pb-32 text-center text-gray-400 font-bold animate-pulse">
        جاري تحميل صفحة البحث...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
