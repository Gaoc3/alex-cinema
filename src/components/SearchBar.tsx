'use client';
import { decryptData } from '@/utils/cryptoHelper';
import { getVideoImageUrl } from '@/utils/imageHelper';
import { dedupeMediaById, getMediaSearchQueryVariants, rankMediaResults } from '@/lib/mediaSearch';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  nb: string;
  ar_title: string;
  en_title?: string;
  year: string;
  stars: string;
  img?: string;
  kind?: string;
}

const allYearsRange = `1900,${new Date().getFullYear()}`;

function SearchResultPoster({ item }: { item: SearchResult }) {
  const [imgFailed, setImgFailed] = useState(false);
  const poster = getVideoImageUrl(item, 'poster');
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.ar_title || item.en_title || '?')}`;

  return (
    <Image
      src={!imgFailed && poster ? poster : fallback}
      alt={item.ar_title || item.en_title || 'ملصق المحتوى'}
      width={64}
      height={96}
      sizes="64px"
      unoptimized
      onError={() => setImgFailed(true)}
      className="w-full h-full object-cover movie-card-img transition-transform duration-500 group-hover/item:scale-110"
    />
  );
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const router = useRouter();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // FIXED: Changed from 'mousedown' to 'click' to prevent Race Condition with Links
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    // Using click ensures the Link's navigation event fires BEFORE the dropdown unmounts
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    debounceTimer.current = setTimeout(async () => {
      try {
        const variants = getMediaSearchQueryVariants(query);
        const responses = await Promise.all(
          variants.flatMap((variant) => {
            const queryEncoded = encodeURIComponent(variant);
            return [
              fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=movies`, { signal }),
              fetch(`/api/proxy?endpoint=AdvancedSearch&level=1&videoTitle=${queryEncoded}&staffTitle=&page=0&year=${allYearsRange}&type=series`, { signal }),
            ];
          }),
        );

        const lists = await Promise.all(responses.map(async (response, index) => {
          if (!response.ok) return [];
          const encrypted = await response.json();
          if (!encrypted?.payload) return [];
          const data = decryptData<SearchResult[]>(encrypted.payload);
          const fallbackKind = index % 2 === 0 ? '1' : '2';
          return Array.isArray(data) ? data.map((item) => ({ ...item, kind: item.kind || fallbackKind })) : [];
        }));

        const sorted = rankMediaResults(dedupeMediaById(lists.flat()), query);

        if (!signal.aborted) {
          setResults(sorted.slice(0, 8));
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
    setIsLoading(false);
    setShowDropdown(false);
    setIsMobileExpanded(false);
  };

  return (
    <div className="relative group w-full xl:w-auto flex-1 xl:flex-none" ref={dropdownRef}>
      {/* Mobile Search Icon Button */}
      <div className="xl:hidden flex justify-end w-full">
        <button
          type="button"
          aria-label="فتح البحث"
          onClick={() => {
            setIsMobileExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:border-alex-primary/60 cursor-pointer transition-all duration-300 shadow-[0_4px_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] hover:-translate-y-1"
        >
          <i className="fa-solid fa-search text-sm sm:text-base"></i>
        </button>
      </div>

      {/* The Search Bar (always visible on desktop, absolute overlay on mobile when expanded) */}
      <div className={`
        xl:block xl:relative xl:h-auto xl:w-auto xl:bg-transparent xl:z-auto xl:inset-auto xl:p-0
        ${isMobileExpanded ? 'fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex justify-center pt-6 sm:pt-12 px-4 sm:px-8 animate-fade-in' : 'hidden'}
      `}>
        <div className={`
          w-full xl:w-auto
          ${isMobileExpanded ? 'max-w-2xl w-full mx-auto bg-[#0f111a]/95 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-fade-in-up h-max max-h-[85vh]' : ''}
        `}>
          <form onSubmit={handleSubmit} className={`relative w-full flex items-center shrink-0 gap-2 xl:gap-3 ${isMobileExpanded ? 'p-2 border-b border-white/[0.05]' : ''}`}>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
              className="bg-transparent xl:bg-white/5 focus:xl:bg-[#06070a]/90 xl:backdrop-blur-md border-none xl:border xl:border-white/5 focus:xl:border-alex-primary/40 text-white pr-14 xl:pr-10 pl-4 py-4 xl:py-2 h-auto rounded-none xl:rounded-full w-full xl:w-64 focus:w-full xl:focus:w-80 transition-all duration-500 outline-none text-xl sm:text-2xl font-bold xl:font-normal xl:text-sm block shadow-none focus:shadow-none xl:shadow-inner xl:focus:shadow-[0_0_20px_rgba(229,9,20,0.15)] placeholder:text-gray-500 xl:placeholder:text-gray-400"
              placeholder="ابحث..."
              aria-label="البحث عن فيلم أو مسلسل"
            />
            <div className="absolute inset-y-0 right-0 pr-4 xl:pr-4 flex items-center pointer-events-none text-gray-500 xl:text-gray-400 group-focus-within:text-alex-primary transition-colors">
              <i className="fa-solid fa-search text-xl sm:text-2xl xl:text-base drop-shadow-md"></i>
            </div>
            
            {isLoading && (
              <div className="absolute inset-y-0 left-3 flex items-center">
                <div className="w-4 h-4 border-2 border-alex-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Close button for mobile inside palette */}
          <button 
            type="button" 
            aria-label="إغلاق البحث"
            onClick={() => {
                setIsMobileExpanded(false);
                setShowDropdown(false);
                setQuery('');
                setResults([]);
                setIsLoading(false);
            }} 
            className="xl:hidden w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-transparent hover:bg-white/5 transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </form>

        {showDropdown && query.trim().length >= 2 && (results.length > 0 || !isLoading) && (
          <div className={`
            xl:absolute xl:top-full xl:left-0 xl:right-auto xl:w-[450px] lg:w-[500px] xl:mt-4 xl:bg-[#06070a]/80 xl:backdrop-blur-3xl xl:border xl:border-white/[0.05] xl:shadow-[0_30px_60px_rgba(0,0,0,0.7)] xl:rounded-[24px] xl:animate-fade-in-up xl:py-3
            ${isMobileExpanded ? 'w-full bg-transparent flex-1 min-h-0 flex flex-col overflow-hidden' : 'hidden xl:block'}
          `}>
            
            <div 
              ref={containerRef}
              className={`overflow-y-auto custom-scrollbar divide-y divide-white/[0.03] overscroll-contain pr-1 pl-1 ${isMobileExpanded ? 'flex-1' : 'max-h-[476px]'}`}
            >
              {results.length > 0 ? (
                results.map((item) => (
                  <Link
                    key={item.nb}
                    href={`/watch/${item.nb}?title=${encodeURIComponent(item.ar_title || item.en_title || '')}`}
                    onClick={handleItemClick}
                    className="flex items-center justify-between gap-4 pr-4 py-4 pl-6 hover:bg-white/[0.04] transition-all duration-300 group/item relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-alex-primary transform scale-y-0 group-hover/item:scale-y-100 transition-transform duration-300 origin-center"></div>

                    <div className="flex items-center gap-4 flex-grow min-w-0">
                      <div className="w-16 h-24 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md relative movie-card-img-wrapper group-hover/item:border-alex-primary/30 transition-colors duration-300">
                        <SearchResultPoster item={item} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      <div className="flex-grow min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-black text-gray-100 group-hover/item:text-white transition-colors truncate text-right leading-tight">
                          {item.ar_title}
                        </h4>
                        {item.en_title && item.en_title !== item.ar_title && (
                          <p className="text-xs text-gray-400 font-en font-semibold truncate mt-1 text-right">{item.en_title}</p>
                        )}
                        
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


          </div>
        )}
        </div>

        {/* Mobile close overlay background click handler */}
        {isMobileExpanded && (
          <div 
            className="xl:hidden fixed inset-0 z-[-1]" 
            onClick={() => {
              setIsMobileExpanded(false);
              setShowDropdown(false);
              setQuery('');
              setResults([]);
              setIsLoading(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
