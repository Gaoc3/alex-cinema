'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResult {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  kind?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Custom high-performance scrollbar state & refs (bypasses default Windows/Chrome arrow rendering)
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(30);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!containerRef.current || !thumbRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const maxScrollTop = scrollHeight - clientHeight;
    if (maxScrollTop <= 0) return;
    const scrollPercent = scrollTop / maxScrollTop;
    const maxThumbTranslate = clientHeight - thumbHeight;
    const translateY = scrollPercent * maxThumbTranslate;
    thumbRef.current.style.transform = `translateY(${translateY}px)`;
  };

  // Sync scrollbar state when dropdown or results change
  useEffect(() => {
    if (!showDropdown) return;
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const { scrollHeight, clientHeight } = containerRef.current;
      if (scrollHeight > clientHeight) {
        setShowScrollbar(true);
        const height = Math.max(30, (clientHeight / scrollHeight) * clientHeight);
        setThumbHeight(height);
        containerRef.current.scrollTop = 0;
        if (thumbRef.current) {
          thumbRef.current.style.transform = 'translateY(0px)';
        }
      } else {
        setShowScrollbar(false);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [results, showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results on query change (debounced)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowDropdown(true);

    const controller = new AbortController();
    const { signal } = controller;

    debounceTimer.current = setTimeout(async () => {
      try {
        const queryEncoded = encodeURIComponent(query);
        const [resMovies, resSeries] = await Promise.all([
          fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=1900,2026&type=movies`, { signal }),
          fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=1900,2026&type=series`, { signal })
        ]);

        let moviesList: SearchResult[] = [];
        let seriesList: SearchResult[] = [];

        if (resMovies.ok) {
          const data = await resMovies.json();
          moviesList = Array.isArray(data) ? data : [];
        }
        if (resSeries.ok) {
          const data = await resSeries.json();
          seriesList = Array.isArray(data) ? data : [];
        }

        // Merge all results
        const combined = [...moviesList, ...seriesList];

        // Smart Relevance Sorting (Exact matches first, then prefix matches, then rating)
        const queryClean = query.trim().toLowerCase();
        const sorted = combined.sort((a, b) => {
          const titleA = (a.en_title || a.ar_title || '').trim().toLowerCase();
          const titleB = (b.en_title || b.ar_title || '').trim().toLowerCase();

          // 1. Exact match priority
          const exactA = titleA === queryClean;
          const exactB = titleB === queryClean;
          if (exactA && !exactB) return -1;
          if (!exactA && exactB) return 1;

          // 2. Starts with query priority
          const startsA = titleA.startsWith(queryClean);
          const startsB = titleB.startsWith(queryClean);
          if (startsA && !startsB) return -1;
          if (!startsA && startsB) return 1;

          // 3. Star rating priority
          const starsA = parseFloat(a.stars) || 0;
          const starsB = parseFloat(b.stars) || 0;
          return starsB - starsA;
        });

        if (!signal.aborted) {
          setResults(sorted.slice(0, 8));
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return; // Request was aborted, ignore
        }
        console.error('Live search failed:', e);
        setResults([]);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 150);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      controller.abort();
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleItemClick = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative group" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
          autoComplete="off"
          className="w-40 sm:w-64 md:w-72 lg:w-80 glass-panel border border-white/10 rounded-full py-2 sm:py-2.5 lg:py-3 pr-9 pl-9 sm:pr-10 sm:pl-10 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-alex-primary focus:bg-black/40 focus:ring-1 focus:ring-alex-primary transition-all duration-300 shadow-inner"
          placeholder="ابحث..."
        />
        <div className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-alex-primary transition-colors">
          <i className="fa-solid fa-search text-sm sm:text-base"></i>
        </div>
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-y-0 left-3 flex items-center">
            <div className="w-4 h-4 border-2 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </form>

      {/* Live Search Results Dropdown */}
      {showDropdown && query.trim().length >= 2 && (results.length > 0 || !isLoading) && (
        <div className="fixed inset-x-2 top-[72px] sm:absolute sm:top-full sm:left-0 sm:right-auto sm:w-[450px] lg:w-[500px] mt-3 glass-panel max-sm:!bg-[#0b0f19] max-sm:!backdrop-blur-none bg-slate-900/80 border border-white/10 backdrop-blur-3xl rounded-[22px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(229,9,20,0.03)] z-50 animate-fade-in-up py-3 group/scrollbar">
          
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="max-h-[476px] overflow-y-auto hide-scrollbar divide-y divide-white/[0.03]"
          >
            {results.length > 0 ? (
              results.map((item) => (
                <Link
                  key={item.nb}
                  href={`/watch/${item.nb}`}
                  onClick={handleItemClick}
                  className="flex items-center justify-between gap-4 pr-4 py-4 pl-6 hover:bg-white/[0.04] transition-all duration-300 group/item relative overflow-hidden"
                >
                  {/* Left edge indicator on hover (RTL: right edge) */}
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-alex-primary transform scale-y-0 group-hover/item:scale-y-100 transition-transform duration-300 origin-center"></div>

                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    {/* Poster Image */}
                    <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative group-hover/item:border-alex-primary/30 transition-colors duration-300">
                      <img
                        src={item.img ? `https://mtskycinemana.serveousercontent.com/cgi-bin/api?url=${encodeURIComponent(\'https://cnth2.shabakaty.com/vascin-poster-images/' + (item.img))}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.ar_title)}`}
                        alt={item.ar_title}
                        className="w-full h-full object-cover transform group-hover/item:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Metadata Content */}
                    <div className="flex-grow min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-black text-gray-100 group-hover/item:text-white transition-colors truncate text-right leading-tight">
                        {item.ar_title}
                      </h4>
                      {item.en_title && item.en_title !== item.ar_title && (
                        <p className="text-xs text-gray-400 font-en font-semibold truncate mt-1 text-right">{item.en_title}</p>
                      )}
                      
                      {/* Meta Tags Row */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap justify-end">
                        <span className="text-[10px] font-black text-alex-primary bg-alex-primary/10 border border-alex-primary/20 px-2 py-0.5 rounded-md">
                          {item.kind === '1' ? 'فيلم' : 'مسلسل'}
                        </span>
                        <span className="text-[10px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-en">
                          <i className="fa-solid fa-star text-[8px]"></i> {item.stars}
                        </span>
                        <span className="text-[10px] font-bold text-gray-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-en">
                          {item.year}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Left pointing arrow on hover */}
                  <div className="shrink-0 pl-2 opacity-0 group-hover/item:opacity-100 transition-all duration-300 transform translate-x-2 group-hover/item:translate-x-0 text-alex-primary">
                    <i className="fa-solid fa-chevron-left text-sm"></i>
                  </div>
                </Link>
              ))
            ) : (
              !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                  <i className="fa-solid fa-magnifying-glass text-3xl text-gray-500 mb-2"></i>
                  <p className="text-sm text-gray-400 font-bold">لا توجد نتائج مطابقة</p>
                </div>
              )
            )}
          </div>

          {/* Custom Scrollbar track & thumb */}
          {showScrollbar && (
            <div className="absolute left-1.5 top-3 bottom-3 w-1 bg-white/5 rounded-full pointer-events-none z-50">
              <div 
                ref={thumbRef}
                className="w-full bg-white/12 group-hover/scrollbar:bg-white/24 rounded-full transition-all duration-200"
                style={{
                  height: `${thumbHeight}px`,
                  transform: 'translateY(0px)'
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
