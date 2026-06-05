'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface VideoItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  imgMediumThumb?: string;
  imgThumb?: string;
  kind?: string;
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

const YEARS = [
  { value: '1900,2026', label: 'الكل' },
  { value: '2020,2026', label: '2020 - 2026' },
  { value: '2010,2019', label: '2010 - 2019' },
  { value: '2000,2009', label: '2000 - 2009' },
  { value: '1900,1999', label: 'قبل 2000' }
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'all' | 'movies' | 'series'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [yearRange, setYearRange] = useState('1900,2026');
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
      const queryEncoded = encodeURIComponent(query);
      const categoryParam = categoryId ? `&category_id=${categoryId}` : '';
      const starParam = starRating ? `&star=${starRating}` : '';

      try {
        const fetchMovies = typeFilter === 'all' || typeFilter === 'movies';
        const fetchSeries = typeFilter === 'all' || typeFilter === 'series';

        let moviesPromise = Promise.resolve<VideoItem[]>([]);
        let seriesPromise = Promise.resolve<VideoItem[]>([]);

        if (fetchMovies) {
          moviesPromise = fetch(
            `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${yearRange}&type=movies${categoryParam}${starParam}`,
            { signal }
          )
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => (Array.isArray(data) ? data : []));
        }

        if (fetchSeries) {
          seriesPromise = fetch(
            `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${yearRange}&type=series${categoryParam}${starParam}`,
            { signal }
          )
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => (Array.isArray(data) ? data : []));
        }

        const [moviesData, seriesData] = await Promise.all([moviesPromise, seriesPromise]);

        if (!signal.aborted) {
          setMovies(moviesData);
          setSeries(seriesData);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.error('Advanced Search failed:', e);
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
      performSearch();
    } else {
      setMovies([]);
      setSeries([]);
      setIsLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [query, typeFilter, categoryId, yearRange, starRating]);

  const activeGenreTitle = GENRES.find((g) => g.nb === categoryId)?.title || 'الكل';
  const activeYearLabel = YEARS.find((y) => y.value === yearRange)?.label || 'الكل';
  const totalResults = (typeFilter === 'all' || typeFilter === 'movies' ? movies.length : 0) + 
                       (typeFilter === 'all' || typeFilter === 'series' ? series.length : 0);

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
          نتائج البحث عن: <span className="text-alex-primary tracking-tight break-all">"{query}"</span>
        </h1>
        <p className="text-gray-400 font-medium">
          تم العثور على {isLoading ? '...' : totalResults} نتيجة مطابقة
        </p>
      </div>

      {/* ADVANCED FILTER BAR */}
      <div className="mb-8 sm:mb-14 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-6 bg-[#0d1323]/40 border border-white/5 p-3 sm:p-4 rounded-2xl backdrop-blur-md shadow-xl select-none">
        
        {/* Right side: Type toggles and Dropdowns */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Movies / Series Toggle Button Pill */}
          <div className="flex bg-[#070a13] p-1 rounded-xl border border-white/5">
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
              className={`flex items-center gap-2 px-4 py-2.5 bg-[#070a13] border rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer ${
                categoryId ? 'border-alex-primary/30 text-alex-primary' : 'border-white/5'
              }`}
            >
              <i className="fa-solid fa-filter text-gray-500"></i>
              <span>الأنواع: {activeGenreTitle}</span>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isGenreOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isGenreOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#070a13] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col p-1.5 max-h-72 overflow-y-auto custom-scrollbar">
                {GENRES.map((g) => (
                  <button
                    key={g.nb}
                    onClick={() => {
                      setCategoryId(g.nb);
                      setIsGenreOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
              className={`flex items-center gap-2 px-4 py-2.5 bg-[#070a13] border rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer ${
                yearRange !== '1900,2026' ? 'border-alex-primary/30 text-alex-primary' : 'border-white/5'
              }`}
            >
              <i className="fa-solid fa-calendar text-gray-500"></i>
              <span>سنة: {activeYearLabel}</span>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-500 transition-transform ${isYearOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {isYearOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-[#070a13] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col p-1.5">
                {YEARS.map((y) => (
                  <button
                    key={y.value}
                    onClick={() => {
                      setYearRange(y.value);
                      setIsYearOpen(false);
                    }}
                    className={`w-full text-right px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
        <div className="flex flex-wrap items-center gap-2.5 bg-[#070a13] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-white/5">
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
          <div>
            <div className="h-6 w-48 bg-white/5 rounded-md animate-pulse mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[2/3] w-full bg-white/5 rounded-2xl border border-white/5 animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      ) : totalResults === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 glass-panel rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0e17]/80"></div>
          <i className="fa-solid fa-search text-6xl text-gray-700 mb-6 drop-shadow-lg relative z-10 animate-pulse"></i>
          <h2 className="text-3xl font-black text-gray-400 mb-2 relative z-10">لا توجد نتائج مطابقة لتصفيتك</h2>
          <p className="text-gray-500 mb-8 relative z-10">حاول تغيير خيارات التصفية أو البحث بكلمات أخرى.</p>
          <button
            onClick={() => {
              setCategoryId('');
              setYearRange('1900,2026');
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-12">
                {movies.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}`} 
                    className="group/card block relative snap-start"
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                      <img 
                        src={`https://cnth2.shabakaty.com/vascin-poster-images/${video.img || video.imgMediumThumb || video.imgThumb}`} 
                        alt={video.ar_title} 
                        className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                        loading="lazy"
                      />
                      <div className="movie-card-overlay"></div>

                      {/* Play Hover Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-14 h-14 rounded-full bg-alex-primary/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] backdrop-blur-md">
                          <i className="fa-solid fa-play ml-1 text-xl"></i>
                        </div>
                      </div>
                    </div>

                    {/* Info Details directly below the poster */}
                    <div className="mt-3 px-1 space-y-1.5">
                      {/* Rating & Title Row */}
                      <div className="flex items-center justify-between gap-2.5">
                        <h3 className="text-sm font-bold text-gray-100 group-hover/card:text-white transition-colors truncate flex-grow text-right leading-tight" title={video.ar_title}>
                          {video.ar_title}
                        </h3>

                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-400">
                          <span className="font-en mt-0.5">{video.stars}</span>
                          <span className="text-[8px] opacity-70">IMDb</span>
                        </div>
                      </div>

                      {/* Category & Year Row */}
                      <div className="flex items-center text-[11px] font-semibold text-gray-400 justify-end gap-1.5 leading-none">
                        <span>{video.year}</span>
                        {video.categories && video.categories.length > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{video.categories[0].ar_title}</span>
                          </>
                        )}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-12">
                {series.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}`} 
                    className="group/card block relative snap-start"
                    style={{ animationDelay: `${index * 25}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                      <img 
                        src={`https://cnth2.shabakaty.com/vascin-poster-images/${video.img || video.imgMediumThumb || video.imgThumb}`} 
                        alt={video.ar_title} 
                        className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                        loading="lazy"
                      />
                      <div className="movie-card-overlay"></div>

                      {/* Play Hover Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-14 h-14 rounded-full bg-alex-primary/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] backdrop-blur-md">
                          <i className="fa-solid fa-play ml-1 text-xl"></i>
                        </div>
                      </div>
                    </div>

                    {/* Info Details directly below the poster */}
                    <div className="mt-3 px-1 space-y-1.5">
                      {/* Rating & Title Row */}
                      <div className="flex items-center justify-between gap-2.5">
                        <h3 className="text-sm font-bold text-gray-100 group-hover/card:text-white transition-colors truncate flex-grow text-right leading-tight" title={video.ar_title}>
                          {video.ar_title}
                        </h3>

                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-black text-yellow-400">
                          <span className="font-en mt-0.5">{video.stars}</span>
                          <span className="text-[8px] opacity-70">IMDb</span>
                        </div>
                      </div>

                      {/* Category & Year Row */}
                      <div className="flex items-center text-[11px] font-semibold text-gray-400 justify-end gap-1.5 leading-none">
                        <span>{video.year}</span>
                        {video.categories && video.categories.length > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{video.categories[0].ar_title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
