'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface VideoItem {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img: string;
  categories?: { ar_title: string }[];
}

const CATEGORIES = [
  { id: '', title: 'كل التصنيفات' },
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
  { id: '61', title: 'وثائقي' }
];

const YEARS = [
  { value: '1900,2026', label: 'كل السنوات' },
  { value: '2020,2026', label: '2020 - 2026' },
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
  { value: 'stars', label: 'الأعلى تقييماً' },
  { value: 'year', label: 'سنة الإصدار' },
  { value: 'name', label: 'الحروف الأبجدية' }
];

function MoviesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedCategory = searchParams.get('category') || '';
  const selectedSort = searchParams.get('sort') || 'recent';
  const selectedYear = searchParams.get('year') || '1900,2026';
  const selectedRating = searchParams.get('rating') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [movies, setMovies] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovies() {
      setLoading(true);
      
      const yearRange = selectedYear;
      const catParam = selectedCategory ? `&category_id=${selectedCategory}` : '';
      const starParam = selectedRating ? `&star=>=${selectedRating}` : '';
      
      const ITEMS_PER_PAGE = 30;
      const API_PAGE_SIZE = 12;
      
      const startItem = (page - 1) * ITEMS_PER_PAGE;
      const endItem = page * ITEMS_PER_PAGE - 1;
      
      const firstApiPage = Math.floor(startItem / API_PAGE_SIZE);
      const lastApiPage = Math.floor(endItem / API_PAGE_SIZE);
      
      const apiPagesToFetch = [];
      for (let i = firstApiPage; i <= lastApiPage; i++) {
        apiPagesToFetch.push(i);
      }

      try {
        const fetchPromises = apiPagesToFetch.map(apiPage => {
          const url = `/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=&staffTitle=&page=${apiPage}&year=${yearRange}&type=movies${catParam}${starParam}`;
          return fetch(url).then(res => res.ok ? res.json() : []);
        });
        
        const results = await Promise.all(fetchPromises);
        let combinedList: VideoItem[] = [];
        
        results.forEach(data => {
          if (Array.isArray(data)) {
            combinedList.push(...data);
          }
        });
        
        const offset = startItem % API_PAGE_SIZE;
        let list = combinedList.slice(offset, offset + ITEMS_PER_PAGE);

        // Client-side Sorting
        if (selectedSort === 'recent') {
          list = [...list].sort((a, b) => parseInt(b.nb) - parseInt(a.nb));
        } else if (selectedSort === 'stars') {
          list = [...list].sort((a, b) => parseFloat(b.stars || '0') - parseFloat(a.stars || '0'));
        } else if (selectedSort === 'year') {
          list = [...list].sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
        } else if (selectedSort === 'name') {
          list = [...list].sort((a, b) => (a.ar_title || '').localeCompare(b.ar_title || ''));
        }

        setMovies(list);
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
      router.push(`${window.location.pathname}?${params.toString()}`);
    }
  };

  const handleCategoryChange = (catId: string) => {
    updateParams({ category: catId, page: '1' });
  };

  const handleYearChange = (yearVal: string) => {
    updateParams({ year: yearVal === '1900,2026' ? null : yearVal, page: '1' });
  };

  const handleRatingChange = (ratingVal: string) => {
    updateParams({ rating: ratingVal || null, page: '1' });
  };

  const handleSortChange = (sortVal: string) => {
    updateParams({ sort: sortVal, page: '1' });
  };

  return (
    <div className="min-h-screen pt-20 sm:pt-24 lg:pt-32 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in-up">
      {/* Title */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-1.5 h-10 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
        <div>
          <h1 className="text-4xl font-black text-white drop-shadow-md tracking-wide">أرشيف الأفلام</h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">استخدم الفلاتر الجانبية والعلوية للوصول للأفلام المطلوبة</p>
        </div>
      </div>

      {/* Main Split Layout: Category sidebar on the right, Grid content on the left */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Category Selector for Mobile (Horizontal Rail) */}
        <div className="flex lg:hidden overflow-x-auto gap-2.5 pb-4 hide-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-alex-primary text-white shadow-[0_0_10px_rgba(229,9,20,0.4)]'
                  : 'glass-panel text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Left Column (Top Filters and Main Grid) */}
        <div className="flex-grow">
          {/* Top Horizontal Filter Bar */}
          <div className="glass-panel p-5 rounded-2xl mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* صنف حسب */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">صنف حسب:</span>
                <select
                  value={selectedSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-[#0c1221] border border-white/5 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-alex-primary/50 transition-all"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* التقييم */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">التقييم:</span>
                <select
                  value={selectedRating}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  className="bg-[#0c1221] border border-white/5 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-alex-primary/50 transition-all"
                >
                  {RATINGS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* السنة */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">السنة:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-[#0c1221] border border-white/5 text-gray-200 text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:border-alex-primary/50 transition-all"
                >
                  {YEARS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total Indicator */}
            <div className="text-xs text-gray-400 font-bold">
              وجدت <span className="font-en text-alex-primary text-sm font-black mx-1">{movies.length}</span> فيلماً
            </div>
          </div>

          {/* Grid Content / Loading */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="w-12 h-12 rounded-full border-4 border-alex-primary/20 border-t-alex-primary animate-spin mb-4"></div>
              <p className="text-gray-400 font-semibold text-sm">جاري تحميل الأفلام...</p>
            </div>
          ) : movies.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-5 gap-y-12">
                {movies.map((video, index) => (
                  <Link 
                    key={video.nb} 
                    href={`/watch/${video.nb}`} 
                    className="group/card block relative snap-start animate-fade-in-up"
                    style={{ animationDelay: `${index * 15}ms` }}
                  >
                    {/* Poster Wrapper */}
                    <div className="aspect-[2/3] w-full relative rounded-2xl overflow-hidden border border-white/5 bg-transparent movie-card-img-wrapper">
                      <img 
                        src={`https://cnth2.shabakaty.com/vascin-poster-images/${video.img}`} 
                        alt={video.ar_title} 
                        className="object-cover w-full h-full movie-card-img transition-transform duration-700 group-hover/card:scale-110"
                        loading="lazy"
                      />
                      <div className="movie-card-overlay"></div>

                      {/* Play Hover Indicator */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transform scale-50 group-hover/card:opacity-100 group-hover/card:scale-100 transition-all duration-300 z-20">
                        <div className="w-14 h-14 rounded-full bg-alex-primary/95 flex items-center justify-center text-white shadow-[0_0_20px_rgba(229,9,20,0.5)] backdrop-blur-md">
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
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-12 sm:mt-16">
                {page > 1 ? (
                  <button 
                    onClick={() => updateParams({ page: (page - 1).toString() })}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover-scale cursor-pointer"
                  >
                    <i className="fa-solid fa-arrow-right"></i>
                    <span>الصفحة السابقة</span>
                  </button>
                ) : (
                  <div className="opacity-30 flex items-center gap-2 bg-white/5 text-gray-400 border border-white/5 px-6 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed">
                    <i className="fa-solid fa-arrow-right"></i>
                    <span>الصفحة السابقة</span>
                  </div>
                )}
                
                <div className="glass-panel px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl text-xs sm:text-sm font-black text-gray-200 border border-white/10 shadow-lg">
                  صفحة <span className="font-en text-alex-primary font-black mx-1">{page}</span>
                </div>

                {movies.length >= 10 ? (
                  <button 
                    onClick={() => updateParams({ page: (page + 1).toString() })}
                    className="flex items-center gap-1.5 sm:gap-2 bg-alex-primary text-white border border-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.3)] px-3 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover-scale cursor-pointer"
                  >
                    <span>الصفحة التالية</span>
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                ) : (
                  <div className="opacity-30 flex items-center gap-2 bg-white/5 text-gray-400 border border-white/5 px-6 py-3.5 rounded-xl font-bold text-sm cursor-not-allowed">
                    <span>الصفحة التالية</span>
                    <i className="fa-solid fa-arrow-left"></i>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 opacity-60">
              <i className="fa-solid fa-film text-7xl text-gray-600 mb-4 animate-pulse"></i>
              <p className="text-2xl text-gray-400 font-medium">لا توجد أفلام مطابقة للفلاتر المختارة</p>
            </div>
          )}
        </div>

        {/* Right Column (Category Sidebar Selector for Desktop) */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="glass-panel rounded-2xl p-5 sticky top-32 space-y-4">
            <h3 className="text-sm font-bold text-gray-400 border-b border-white/5 pb-3">تصنيفات الأفلام</h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 hide-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-alex-primary text-white shadow-[0_0_10px_rgba(229,9,20,0.4)] font-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{cat.title}</span>
                  {selectedCategory === cat.id && <i className="fa-solid fa-check text-[10px]"></i>}
                </button>
              ))}
            </div>
          </div>
        </aside>

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
