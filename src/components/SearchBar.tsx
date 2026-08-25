'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { decryptData } from '@/utils/cryptoHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';
import MediaPosterImage from '@/components/MediaPosterImage';

interface SearchResult {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  imgMediumThumb?: string;
  imgThumb?: string;
  imgObjUrl?: string;
  kind?: string;
}

const allYearsRange = `1900,${new Date().getFullYear()}`;

const TRENDING_SEARCHES = [
  { label: 'أفلام 2026', query: '2026' },
  { label: 'أكشن ومغامرات', query: 'اكشن' },
  { label: 'أنمي مترجم', query: 'انمي' },
  { label: 'مسلسلات تركية', query: 'تركي' },
  { label: 'أفلام رعب', query: 'رعب' },
  { label: 'كوميديا', query: 'كوميدي' },
  { label: 'جريمة وغموض', query: 'جريمة' },
  { label: 'خيال علمي', query: 'خيال' },
];

const QUICK_CATEGORIES = [
  { title: 'الأفلام', href: '/movies', icon: 'fa-film', color: 'from-red-600/20 to-red-950/40 border-red-500/30' },
  { title: 'المسلسلات', href: '/series', icon: 'fa-tv', color: 'from-blue-600/20 to-blue-950/40 border-blue-500/30' },
  { title: 'الإصدارات الجديدة', href: '/new-releases', icon: 'fa-fire', color: 'from-amber-600/20 to-amber-950/40 border-amber-500/30' },
  { title: 'الرومات النشطة', href: '/rooms', icon: 'fa-users', color: 'from-purple-600/20 to-purple-950/40 border-purple-500/30' },
];

function SearchResultPoster({ item }: { item: SearchResult }) {
  return (
    <MediaPosterImage
      video={item}
      type="poster"
      sizes="(max-width: 640px) 70px, 80px"
      className="movie-card-img transition-transform duration-500 group-hover/item:scale-110"
    />
  );
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile search modal is open
  useEffect(() => {
    if (isMobileExpanded) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => mobileInputRef.current?.focus(), 80);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileExpanded]);

  // Live search debounced fetch
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const variants = getMediaSearchQueryVariants(query);
        const responses = await Promise.all(
          variants.flatMap((variant) => {
            const queryEncoded = encodeURIComponent(variant);
            return [
              fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=movies`, { signal }),
              fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=series`, { signal }),
            ];
          })
        );

        const lists = await Promise.all(
          responses.map(async (response, index) => {
            if (!response.ok) return [];
            const encrypted = await response.json();
            if (!encrypted?.payload) return [];
            const data = decryptData<SearchResult[]>(encrypted.payload);
            const fallbackKind = index % 2 === 0 ? '1' : '2';
            return Array.isArray(data) ? data.map((item) => ({ ...item, kind: item.kind || fallbackKind })) : [];
          })
        );

        const sorted = rankMediaResults(dedupeMediaById(lists.flat()), query);

        if (!signal.aborted) {
          setResults(sorted.slice(0, 10));
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!signal.aborted) setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [query]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setShowDropdown(false);
      return;
    }
    setIsLoading(true);
    setShowDropdown(true);
  };

  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      setShowDropdown(false);
      setIsMobileExpanded(false);
      inputRef.current?.blur();
      mobileInputRef.current?.blur();
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleItemClick = () => {
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setShowDropdown(false);
    setIsMobileExpanded(false);
  };

  const handleTagClick = (tagQuery: string) => {
    setQuery(tagQuery);
    setIsLoading(true);
    setShowDropdown(true);
    mobileInputRef.current?.focus();
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setShowDropdown(false);
    mobileInputRef.current?.focus();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full xl:w-auto" ref={dropdownRef}>
      {/* ------------------------------------------------------------- */}
      {/* MOBILE TRIGGER BUTTON (Sleek Glass Cinema Style)             */}
      {/* ------------------------------------------------------------- */}
      <div className="xl:hidden flex items-center justify-end">
        <button
          type="button"
          aria-label="فتح شريط البحث"
          onClick={() => setIsMobileExpanded(true)}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-black/40 backdrop-blur-xl border border-white/15 text-gray-200 hover:text-white hover:border-[#e50914]/60 hover:bg-[#e50914]/15 active:scale-95 transition-all duration-300 shadow-[0_4px_15px_rgba(0,0,0,0.5)] cursor-pointer outline-none"
        >
          <i className="fa-solid fa-magnifying-glass text-sm sm:text-base"></i>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP SEARCH BAR (Luxury Glass Navbar Input)                */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden xl:block relative">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="relative group/search flex items-center w-64 focus-within:w-80 transition-all duration-300">
            {/* Search Icon */}
            <div className="absolute right-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within/search:text-[#e50914] transition-colors">
              <i className="fa-solid fa-magnifying-glass text-xs"></i>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e);
                } else if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
              className="w-full h-10 pr-9 pl-9 rounded-xl bg-black/40 hover:bg-black/60 focus:bg-[#07090e]/95 text-white text-xs font-medium placeholder:text-gray-400 border border-white/15 hover:border-white/25 focus:border-[#e50914]/70 outline-none backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:shadow-[0_0_25px_rgba(229,9,20,0.25)] transition-all duration-300 block"
              placeholder="ابحث عن فيلم، مسلسل..."
              aria-label="البحث"
            />

            {/* Spinner or Clear Button */}
            {isLoading ? (
              <div className="absolute left-3 flex items-center">
                <div className="w-3.5 h-3.5 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                aria-label="مسح البحث"
                className="absolute left-3 w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-[10px]"></i>
              </button>
            ) : null}
          </div>
        </form>

        {/* Desktop Live Results Popover */}
        {showDropdown && query.trim().length >= 2 && (
          <div className="absolute top-full right-0 mt-3 w-[420px] bg-[#07090e]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(229,9,20,0.15)] overflow-hidden z-[150] animate-fade-in-up flex flex-col" dir="rtl">
            {/* Header summary */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
              <span className="text-[11px] font-bold text-gray-400">
                نتائج البحث عن <span className="text-white font-extrabold">&ldquo;{query.trim()}&rdquo;</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#e50914]/20 text-[#e50914] border border-[#e50914]/30">
                {results.length} نتائج
              </span>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[460px] custom-scrollbar divide-y divide-white/[0.04]">
              {results.length > 0 ? (
                results.map((item) => (
                  <Link
                    key={item.nb}
                    href={`/watch/${item.nb}?title=${encodeURIComponent(item.ar_title || item.en_title || '')}`}
                    onClick={handleItemClick}
                    className="flex items-center justify-between gap-3.5 p-3 hover:bg-white/[0.06] transition-all duration-200 group/item relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-md relative bg-slate-900 group-hover/item:border-[#e50914]/50 transition-colors">
                        <SearchResultPoster item={item} />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-center text-right">
                        <h4 className="text-xs font-black text-gray-100 group-hover/item:text-white transition-colors truncate">
                          {item.ar_title}
                        </h4>
                        {item.en_title && item.en_title !== item.ar_title && (
                          <p className="text-[10px] text-gray-400 font-en font-medium truncate mt-0.5">{item.en_title}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[9px] font-black text-[#e50914] bg-[#e50914]/15 border border-[#e50914]/25 px-1.5 py-0.2 rounded">
                            {item.kind === '1' ? 'فيلم' : 'مسلسل'}
                          </span>
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-1 font-en">
                            <i className="fa-solid fa-star text-[7px]"></i> {item.stars}
                          </span>
                          <span className="text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded font-en">
                            {item.year}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-gray-400 group-hover/item:text-[#e50914] group-hover/item:translate-x-[-2px] transition-all">
                      <i className="fa-solid fa-chevron-left text-xs"></i>
                    </div>
                  </Link>
                ))
              ) : !isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <i className="fa-solid fa-magnifying-glass text-2xl text-gray-500 mb-2"></i>
                  <p className="text-xs font-bold">لا توجد نتائج مطابقة</p>
                </div>
              ) : null}
            </div>

            {/* Bottom Full Search Page Link */}
            <div className="p-2.5 border-t border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full py-2 px-3 rounded-xl bg-[#e50914]/15 hover:bg-[#e50914]/25 border border-[#e50914]/40 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>عرض جميع النتائج لـ &ldquo;{query.trim()}&rdquo;</span>
                <i className="fa-solid fa-arrow-left text-[11px] text-[#e50914]"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE FULLSCREEN IMMERSIVE SEARCH MODAL (Ultra-Luxury iOS UI) */}
      {/* ------------------------------------------------------------- */}
      {isMobileExpanded && (
        <div 
          className="xl:hidden fixed inset-0 z-[200] bg-[#06070a]/98 backdrop-blur-3xl flex flex-col animate-fade-in text-white" 
          dir="rtl"
        >
          {/* Top Bar / Search Input Area */}
          <div className="shrink-0 pt-3 pb-3 px-4 border-b border-white/10 bg-black/40 backdrop-blur-2xl">
            <div className="flex items-center gap-3 max-w-lg mx-auto">
              {/* Back / Exit Button */}
              <button
                type="button"
                aria-label="رجوع"
                onClick={() => {
                  setIsMobileExpanded(false);
                  setShowDropdown(false);
                  setQuery('');
                  setResults([]);
                }}
                className="w-10 h-10 shrink-0 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer outline-none"
              >
                <i className="fa-solid fa-arrow-right text-sm"></i>
              </button>

              {/* Main Search Input */}
              <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
                <div className="absolute right-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </div>

                <input
                  ref={mobileInputRef}
                  type="text"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  className="w-full h-11 pr-10 pl-10 rounded-2xl bg-white/5 border border-white/15 focus:border-[#e50914]/80 focus:bg-white/10 text-white text-sm font-bold placeholder:text-gray-400 outline-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] block"
                  placeholder="ابحث عن فيلم، مسلسل، أنمي..."
                  aria-label="حقل البحث"
                />

                {/* Clear / Spinner Action */}
                {isLoading ? (
                  <div className="absolute left-3.5 flex items-center">
                    <div className="w-4 h-4 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : query.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="مسح النص"
                    className="absolute left-3.5 w-5 h-5 rounded-full bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                ) : null}
              </form>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 max-w-lg mx-auto w-full">
            {/* --- STATE 1: Empty Query - Show Trending Tags & Categories --- */}
            {query.trim().length < 2 && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Trending Tags Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs">
                      <i className="fa-solid fa-fire"></i>
                    </span>
                    <h3 className="text-sm font-black text-gray-200">الأكثر بحثاً</h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TRENDING_SEARCHES.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleTagClick(item.query)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-[#e50914]/20 border border-white/10 hover:border-[#e50914]/40 text-gray-300 hover:text-white transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Navigation Cards */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-lg bg-[#e50914]/10 border border-[#e50914]/20 flex items-center justify-center text-[#e50914] text-xs">
                      <i className="fa-solid fa-compass"></i>
                    </span>
                    <h3 className="text-sm font-black text-gray-200">استكشف الأقسام</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {QUICK_CATEGORIES.map((cat) => (
                      <Link
                        key={cat.title}
                        href={cat.href}
                        onClick={() => setIsMobileExpanded(false)}
                        className={`p-3.5 rounded-2xl bg-gradient-to-br ${cat.color} border backdrop-blur-md flex items-center gap-3 transition-transform active:scale-95 shadow-md`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white text-sm">
                          <i className={`fa-solid ${cat.icon}`}></i>
                        </div>
                        <span className="text-xs font-black text-white">{cat.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --- STATE 2: Loading Skeletons --- */}
            {isLoading && query.trim().length >= 2 && results.length === 0 && (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-14 h-20 rounded-xl bg-white/10 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded-md w-3/4"></div>
                      <div className="h-3 bg-white/5 rounded-md w-1/2"></div>
                      <div className="h-3 bg-white/5 rounded-md w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* --- STATE 3: Results Found --- */}
            {results.length > 0 && query.trim().length >= 2 && (
              <div className="space-y-2.5 pb-20">
                <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/10">
                  <span className="text-xs font-bold text-gray-400">
                    النتائج المباشرة ({results.length})
                  </span>
                  <span className="text-[10px] text-gray-500 font-bold">اضغط للمشاهدة فوراً</span>
                </div>

                {results.map((item) => (
                  <Link
                    key={item.nb}
                    href={`/watch/${item.nb}?title=${encodeURIComponent(item.ar_title || item.en_title || '')}`}
                    onClick={handleItemClick}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 active:scale-[0.98] transition-all duration-200 group/card relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative bg-slate-900 group-hover/card:border-[#e50914]/50">
                        <SearchResultPoster item={item} />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-center text-right">
                        <h4 className="text-sm font-black text-white group-hover/card:text-[#e50914] transition-colors truncate leading-snug">
                          {item.ar_title}
                        </h4>
                        {item.en_title && item.en_title !== item.ar_title && (
                          <p className="text-xs text-gray-400 font-en font-medium truncate mt-0.5">{item.en_title}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[9px] font-black text-[#e50914] bg-[#e50914]/15 border border-[#e50914]/25 px-2 py-0.5 rounded-md">
                            {item.kind === '1' ? 'فيلم' : 'مسلسل'}
                          </span>
                          <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-en">
                            <i className="fa-solid fa-star text-[8px]"></i> {item.stars}
                          </span>
                          <span className="text-[9px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-en">
                            {item.year}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-gray-400 group-hover/card:text-[#e50914] pl-2">
                      <i className="fa-solid fa-chevron-left text-sm"></i>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* --- STATE 4: No Results Found --- */}
            {!isLoading && query.trim().length >= 2 && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-2xl mb-3">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </div>
                <h4 className="text-base font-black text-white mb-1">لم نجد نتائج مطابقة</h4>
                <p className="text-xs text-gray-400 max-w-xs mb-4">
                  تأكد من كتابة الاسم بشكل صحيح أو جرب البحث بكلمات أبسط.
                </p>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
                >
                  البحث في الأرشيف المتقدم
                </button>
              </div>
            )}
          </div>

          {/* Bottom Floating CTA Button */}
          {query.trim().length >= 1 && (
            <div className="shrink-0 p-4 border-t border-white/10 bg-black/60 backdrop-blur-2xl">
              <div className="max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#e50914] to-[#b8070f] text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_25px_rgba(229,9,20,0.5)] active:scale-98 transition-all cursor-pointer"
                >
                  <span>عرض جميع نتائج البحث لـ &ldquo;{query.trim()}&rdquo;</span>
                  <i className="fa-solid fa-arrow-left text-xs"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
