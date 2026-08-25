'use client';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { decryptData } from '@/utils/cryptoHelper';
import MediaPosterImage from '@/components/MediaPosterImage';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Pagination from '@/components/Pagination';
import CardSkeleton from '@/components/skeleton/CardSkeleton';

interface VideoItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img: string;
  imgMediumThumb?: string;
  imgThumb?: string;
  imgObjUrl?: string;
  categories?: { ar_title: string }[];
}

const CATEGORIES = [
  { id: '', title: 'كل التصنيفات' },
  { id: '23', title: 'أنمي' },
  { id: '84', title: 'أكشن' },
  { id: '60', title: 'جريمة' },
  { id: '89', title: 'حياة الغرب' },
  { id: '78', title: 'خيال علمي' },
  { id: '67', title: 'خيالي' },
  { id: '62', title: 'دراما' },
  { id: '57', title: 'رسوم متحركة' },
  { id: '70', title: 'رعب' },
  { id: '77', title: 'رومانسي' },
  { id: '79', title: 'رياضي' },
  { id: '76', title: 'غموض' },
  { id: '59', title: 'كوميدي' },
  { id: '56', title: 'مغامرة' },
  { id: '63', title: 'مصارعة حرة' },
  { id: '61', title: 'وثائقي' }
];

const currentYear = new Date().getFullYear();

const YEARS = [
  { value: `1900,${currentYear}`, label: 'كل السنوات' },
  { value: `2020,${currentYear}`, label: `2020 - ${currentYear}` },
  { value: '2010,2019', label: '2010 - 2019' },
  { value: '2000,2009', label: '2000 - 2009' },
  { value: '1900,1999', label: 'قبل 2000' }
];

const RATINGS = [
  { value: '', label: 'كل التقييمات' },
  { value: '8', label: '8+ IMDb' },
  { value: '7', label: '7+ IMDb' },
  { value: '6', label: '6+ IMDb' },
  { value: '5', label: '5+ IMDb' }
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'الملفات الحديثة' },
  { value: 'popular', label: 'المشهورة' },
  { value: 'stars', label: 'الأعلى تقييماً' },
  { value: 'year', label: 'سنة الإصدار' },
  { value: 'name', label: 'الحروف الأبجدية' }
];

function MoviesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = searchParams.get('category') || '';
  const selectedSort = searchParams.get('sort') || 'recent';
  const selectedYear = searchParams.get('year') || '1900,2026';
  const selectedRating = searchParams.get('rating') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [movies, setMovies] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dropdown states for custom selectors
  const [openDropdown, setOpenDropdown] = useState<'category' | 'sort' | 'rating' | 'year' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click and disable scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      try {
        const yearRange = selectedYear;
        const hasFilters = Boolean(selectedCategory || selectedRating || (selectedYear && selectedYear !== '1900,2026'));

        if (!hasFilters) {
          const url = `/api/proxy?endpoint=latestMovies/level/2/itemsPerPage/30/page/${page}/`;
          const res = await fetch(url);
          if (res.ok) {
            const d = await res.json();
            let list = decryptData<VideoItem[]>(d.payload) || [];
            if (Array.isArray(list)) {
              if (selectedSort === 'recent') {
                list = [...list].sort((a, b) => parseInt(b.nb) - parseInt(a.nb));
              } else if (selectedSort === 'popular' || selectedSort === 'stars') {
                list = [...list].sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));
              } else if (selectedSort === 'year') {
                list = [...list].sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
              }
              setMovies(list);
              return;
            }
          }
        }

        const catParam = selectedCategory ? `&category_id=${selectedCategory}` : '';
        const starParam = selectedRating ? `&star=${selectedRating}` : '';
        const url = `/api/proxy?endpoint=AdvancedSearch&level=2&videoTitle=&staffTitle=&page=${page - 1}&year=${yearRange}&type=movies${catParam}${starParam}`;
        const res = await fetch(url);
        if (res.ok) {
          const d = await res.json();
          const list = decryptData<VideoItem[]>(d.payload) || [];
          if (Array.isArray(list)) {
            setMovies(list);
          } else {
            setMovies([]);
          }
        } else {
          setMovies([]);
        }
      } catch (error) {
        console.error('Failed to load movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    }

    loadMovies();
  }, [page, selectedCategory, selectedYear, selectedRating, selectedSort]);

  const updateParams = (newParams: Record<string, string | null>) => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === null || val === '') {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    }
  };

  const getFilterUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  // Find featured spotlight movie (highest rated)
  const featuredMovie = !loading && movies.length > 0
    ? [...movies].sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'))[0]
    : null;

  return (
    <div className="min-h-screen pt-20 sm:pt-24 lg:pt-28 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in-up">
      
      {/* 1. Cinematic Featured Spotlight Hero */}
      {featuredMovie && (
        <div className="w-full aspect-[21/9] min-h-[220px] md:min-h-[420px] lg:min-h-[460px] rounded-3xl overflow-hidden relative border border-white/10 mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group/hero flex items-center justify-between p-4 sm:p-8 md:p-14 gap-4 md:gap-10" dir="rtl">
          {/* Backdrop Image */}
          <div className="absolute inset-0 select-none pointer-events-none scale-105 blur-md opacity-25 z-0">
            <img src={getVideoImageUrl(featuredMovie, 'poster')} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-l from-[#06070a]/90 via-[#06070a]/50 to-transparent z-10" />
          
          {/* Content Area */}
          <div className="relative z-20 flex-1 flex flex-col justify-center text-right select-none">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="bg-[#E50914] text-white text-[9px] md:text-[10px] font-black px-1.5 md:py-0.5 rounded uppercase tracking-wider">شائع الآن</span>
              <span className="text-gray-400 text-[10px] md:text-xs font-bold">{featuredMovie.year}</span>
            </div>
            
            <h1 className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-black text-white mb-2 md:mb-4 line-clamp-2 leading-tight drop-shadow-lg group-hover/hero:text-alex-primary transition-colors duration-300">
              {featuredMovie.ar_title}
            </h1>
            
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 justify-start text-[10px] md:text-xs font-bold text-gray-300 flex-wrap">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-lg">
                <i className="fa-solid fa-star text-[8px] md:text-[10px]"></i>
                {featuredMovie.stars} IMDb
              </div>
              <div className="truncate max-w-[150px] md:max-w-none">
                {featuredMovie.categories?.map(c => c.ar_title).join(' • ')}
              </div>
            </div>
            
            <div>
              <Link
                href={`/watch/${featuredMovie.nb}?title=${encodeURIComponent(featuredMovie.ar_title || featuredMovie.en_title || '')}`}
                className="inline-flex items-center justify-center bg-[#E50914] hover:bg-[#b8070f] text-white font-black text-[10px] md:text-sm px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl shadow-lg transition-all active:scale-[0.97]"
              >
                <i className="fa-solid fa-play ml-1.5 md:ml-2 text-[8px] md:text-xs"></i>
                شاهد الآن
              </Link>
            </div>
          </div>

          {/* Main Cover Poster - Visible on both desktop and mobile */}
          <div className="relative z-20 h-[80%] md:h-[90%] aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 transition-all duration-300 group-hover/hero:scale-[1.02] group-hover/hero:border-white/20">
            <img src={getVideoImageUrl(featuredMovie, 'poster')} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center gap-3 mb-8" dir="rtl">
        <div className="w-1.5 h-7 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">أرشيف الأفلام السينمائية</h1>
        </div>
      </div>

      {/* 2. Main Layout Grid (Filter Sidebar + Movies Grid) */}
      <div className="w-full mb-8 relative z-50">
        {/* Horizontal Filter Bar */}
        <div className="bg-[#141722]/60 border border-white/5 backdrop-blur-xl p-4 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl relative z-50" ref={dropdownRef} dir="rtl">
          <div className="flex items-center gap-2 px-2">
            <i className="fa-solid fa-sliders text-[#E50914] text-sm"></i>
            <span className="text-sm font-black text-white">خيارات التصفية</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1 xl:justify-end">
            {/* Category Selector */}
            <div className="relative flex-1 min-w-[130px] max-w-[200px]">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                className="w-full bg-[#0b0c10]/80 border border-white/10 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 text-right flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span>{CATEGORIES.find(c => c.id === selectedCategory)?.title || 'كل التصنيفات'}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
              </button>
              {openDropdown === 'category' && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[#0b0c10]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden z-40 shadow-2xl py-1.5 animate-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      href={getFilterUrl({ category: cat.id || null, page: '1' })}
                      scroll={false}
                      onClick={() => setOpenDropdown(null)}
                      className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all block ${
                        selectedCategory === cat.id ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {cat.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative flex-1 min-w-[130px] max-w-[200px]">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                className="w-full bg-[#0b0c10]/80 border border-white/10 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 text-right flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span>{SORT_OPTIONS.find(o => o.value === selectedSort)?.label}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
              </button>
              {openDropdown === 'sort' && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[#0b0c10]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden z-40 shadow-2xl py-1.5 animate-fade-in">
                  {SORT_OPTIONS.map((opt) => (
                    <Link
                      key={opt.value}
                      href={getFilterUrl({ sort: opt.value, page: '1' })}
                      scroll={false}
                      onClick={() => setOpenDropdown(null)}
                      className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all block ${
                        selectedSort === opt.value ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Ratings Selector */}
            <div className="relative flex-1 min-w-[130px] max-w-[200px]">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'rating' ? null : 'rating')}
                className="w-full bg-[#0b0c10]/80 border border-white/10 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 text-right flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span>{RATINGS.find(o => o.value === selectedRating)?.label || 'كل التقييمات'}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
              </button>
              {openDropdown === 'rating' && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[#0b0c10]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden z-40 shadow-2xl py-1.5 animate-fade-in">
                  {RATINGS.map((opt) => (
                    <Link
                      key={opt.value}
                      href={getFilterUrl({ rating: opt.value || null, page: '1' })}
                      scroll={false}
                      onClick={() => setOpenDropdown(null)}
                      className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all block ${
                        selectedRating === opt.value ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Year Selector */}
            <div className="relative flex-1 min-w-[130px] max-w-[200px]">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                className="w-full bg-[#0b0c10]/80 border border-white/10 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 text-right flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
              >
                <span>{YEARS.find(o => o.value === selectedYear)?.label}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-gray-400"></i>
              </button>
              {openDropdown === 'year' && (
                <div className="absolute right-0 top-full mt-2 w-full min-w-[180px] bg-[#0b0c10]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden z-40 shadow-2xl py-1.5 animate-fade-in">
                  {YEARS.map((opt) => (
                    <Link
                      key={opt.value}
                      href={getFilterUrl({ year: opt.value === '1900,2026' ? null : opt.value, page: '1' })}
                      scroll={false}
                      onClick={() => setOpenDropdown(null)}
                      className={`w-[calc(100%-12px)] mx-1.5 my-0.5 rounded-lg text-right px-3 py-2 text-xs font-bold transition-all block ${
                        selectedYear === opt.value ? 'bg-[#E50914] text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {(selectedCategory || selectedSort !== 'recent' || selectedYear !== '1900,2026' || selectedRating) && (
              <Link
                href={pathname}
                scroll={false}
                onClick={() => setOpenDropdown(null)}
                className="px-4 py-2.5 rounded-xl border border-[#E50914]/20 bg-[#E50914]/5 hover:bg-[#E50914]/10 text-[#E50914] text-xs font-black cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap inline-flex items-center"
              >
                <i className="fa-solid fa-rotate-right ml-2"></i>
                إعادة ضبط
              </Link>
            )}

            {/* Results Count */}
            <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/5 text-[11px] text-gray-400 font-bold whitespace-nowrap">
              وجدت <span className="font-en text-white mx-1">{movies.length}</span> نتيجة
            </div>
          </div>
        </div>
      </div>

      {/* 3. Full Width Movies Grid Content */}
      <div className="w-full">
        
        {loading ? (
          <div className="py-2 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
              {Array.from({ length: 30 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {movies.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}?title=${encodeURIComponent(video.ar_title || video.en_title || '')}`}
                    className="group/card block relative snap-start animate-fade-in-up active:scale-95 transition-transform duration-200"
                    style={{ animationDelay: `${index * 15}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden bg-[#141722]/50 border border-white/5 transition-all duration-300 ease-out group-hover/card:scale-[1.03] group-hover/card:shadow-[0_15px_35px_rgba(0,0,0,0.6)] group-hover/card:border-white/20">
                      <MediaPosterImage 
                        video={video}
                        type="poster"
                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 20vw"
                        className="movie-card-img transition-transform duration-700 group-hover/card:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Dark overlay & Watch Play Badge */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="px-3.5 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white text-xs font-black tracking-wide flex items-center gap-1.5 transform scale-75 group-hover/card:scale-100 transition-transform duration-300">
                          <i className="fa-solid fa-play text-[9px] text-alex-primary animate-pulse"></i>
                          <span>شاهد الآن</span>
                        </div>
                      </div>

                      {/* Floating Metadata badges inside poster */}
                      <div className="absolute bottom-2.5 right-2.5 left-2.5 z-20 flex justify-between items-center select-none pointer-events-none">
                        {/* Rating Badge (IMDb Gold) */}
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl text-[10px] font-black text-[#F5C518] flex items-center gap-1 font-en">
                          <i className="fa-solid fa-star text-[8px]"></i>
                          <span>{video.stars}</span>
                        </div>

                        {/* Year Badge (Cool Muted) */}
                        <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl text-[10px] font-black text-gray-300 font-en">
                          {video.year}
                        </div>
                      </div>
                    </div>

                    {/* Title Info Directly Below Poster */}
                    <div className="mt-3 px-1 text-right">
                      <h3 className="text-[13px] font-black text-[#F8FAFC] group-hover/card:text-[#E50914] transition-colors truncate leading-tight" title={video.ar_title}>
                        {video.ar_title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              <Pagination 
                currentPage={page} 
                onPageChange={(p) => updateParams({ page: p.toString() })} 
                hasNextPage={movies.length >= 24} 
                accentColor="primary" 
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-28 opacity-50" dir="rtl">
              <i className="fa-solid fa-film text-6xl text-gray-500 mb-4 animate-pulse"></i>
              <p className="text-lg text-gray-300 font-black">لا توجد نتائج مطابقة للفلاتر المختارة</p>
            </div>
          )}
        </div>

    </div>
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-32 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-alex-primary/20 border-t-alex-primary animate-spin mb-4"></div>
        <p className="text-gray-400 font-semibold text-sm">جاري التحميل...</p>
      </div>
    }>
      <MoviesContent />
    </Suspense>
  );
}
