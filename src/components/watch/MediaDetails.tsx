'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getImageUrl } from '@/utils/imageHelper';
import { safeOpenExternalLink } from '@/lib/telegramWebAppClient';

export interface MediaCategory {
  nb?: string | number;
  ar_title: string;
}

export interface MediaPerson {
  nb?: string | number;
  name: string;
  staff_img_thumb?: string | null;
  staff_img?: string | null;
}

interface MediaDetailsProps {
  title: string;
  enTitle?: string;
  img?: string | null;
  episodeNum?: string;
  seasonNum?: string;
  year?: string;
  categories?: MediaCategory[];
  duration?: number;
  stars?: string;
  content?: string;
  actorsInfo?: MediaPerson[];
  directorsInfo?: MediaPerson[];
  writersInfo?: MediaPerson[];
  kind?: string;
  itemDate?: string;
  imdbUrlRef?: string;
  children?: React.ReactNode;
}

const getSmartCategoryStyle = (catName: string) => {
  const name = catName || '';
  if (/أكشن|إثارة|رعب|جريمة|حرب|قتال/i.test(name)) {
    return 'bg-[#1a1c23]/80 hover:bg-alex-primary text-gray-200 hover:text-white border border-alex-primary/40 hover:border-transparent shadow-lg hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] backdrop-blur-md transition-all duration-300';
  }
  return 'bg-[#1a1c23]/80 hover:bg-white text-gray-200 hover:text-black border border-white/20 hover:border-transparent shadow-lg backdrop-blur-md transition-all duration-300';
};

const ActorCard = ({ name, img }: { name: string; img?: string | null }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  return (
    <div className="flex flex-col items-center text-center gap-1.5 sm:gap-2.5 group select-none min-w-[76px] sm:min-w-0 w-20 sm:w-full transition-all duration-300 hover:-translate-y-1 shrink-0">
      {img && !imgFailed ? (
        <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-white/10 group-hover:border-alex-primary group-hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-500 shadow-xl shrink-0">
          <img
            src={img}
            alt={name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-alex-primary group-hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-500 shadow-inner shrink-0">
          <i className="fa-solid fa-user text-gray-500 text-lg sm:text-2xl group-hover:text-white transition-colors duration-300"></i>
        </div>
      )}
      <div className="flex flex-col min-w-0 items-center w-full">
        <span className="text-white font-en font-bold text-[11px] sm:text-xs md:text-sm tracking-tight leading-snug group-hover:text-alex-primary transition-colors duration-300 text-center line-clamp-2 sm:line-clamp-1 max-w-[80px] sm:max-w-[110px]">
          {name}
        </span>
        <span className="text-gray-500 text-[9px] sm:text-[10px] font-bold">ممثل</span>
      </div>
    </div>
  );
};

export default function MediaDetails({
  title,
  enTitle,
  img,
  episodeNum,
  seasonNum,
  year,
  categories,
  duration,
  stars,
  content,
  actorsInfo,
  directorsInfo,
  writersInfo,
  kind,
  itemDate,
  imdbUrlRef,
  children,
}: MediaDetailsProps) {
  const [isPosterLoaded, setIsPosterLoaded] = useState(false);
  const isSeries = kind === '2';

  const cleanSubtitle = (() => {
    if (!enTitle) return '';
    let cleaned = enTitle.trim();
    const mainTitle = title.trim();
    if (cleaned.toLowerCase().startsWith(mainTitle.toLowerCase())) {
      cleaned = cleaned.substring(mainTitle.length).replace(/^[\s\-–—•:\/]+/, '').trim();
    }
    return cleaned;
  })();

  const posterSrc = img ? getImageUrl(img, 'poster') : null;

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/10 flex flex-col h-full bg-[#0d1424]">
      <div className="relative z-10 w-full flex flex-col gap-4 sm:gap-6">

        {/* ═══════ Section 1: Top Media Header Row (Poster + Title + Badges + IMDb) ═══════ */}
        <div className="flex gap-3.5 sm:gap-6 items-start" dir="rtl">
          {/* Movie / Series Poster with Shimmer Loading Skeleton (Mobile / Tablet) */}
          {posterSrc && (
            <div className="lg:hidden relative w-24 xs:w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-[#070b13] shrink-0 group">
              {!isPosterLoaded && (
                <>
                  <div className="absolute inset-0 bg-white/5 animate-pulse overflow-hidden z-10 rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shine"></div>
                  </div>
                  <style>{`
                    @keyframes skeleton-shine {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(100%); }
                    }
                    .skeleton-shine {
                      animation: skeleton-shine 1.5s infinite;
                    }
                  `}</style>
                </>
              )}
              <Image
                src={posterSrc}
                alt={title}
                fill
                priority
                unoptimized
                onLoad={() => setIsPosterLoaded(true)}
                className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                  isPosterLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none"></div>
            </div>
          )}

          {/* Details Header Column */}
          <div className="flex flex-col gap-1.5 sm:gap-2 flex-grow min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Title & Season / Episode */}
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1 justify-start">
                <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md text-right">
                  {title}
                </h1>
                {(episodeNum || seasonNum) && <span className="text-white/20 font-bold text-base select-none shrink-0">•</span>}
                {seasonNum && (
                  <span className="bg-white text-black px-2.5 py-0.5 rounded-xl text-[10px] sm:text-xs font-black shadow-md select-none shrink-0">
                    الموسم {seasonNum}
                  </span>
                )}
                {episodeNum && (
                  <span className="bg-alex-primary text-white px-2.5 py-0.5 rounded-xl text-[10px] sm:text-xs font-black shadow-[0_0_15px_rgba(229,9,20,0.4)] select-none shrink-0">
                    الحلقة {episodeNum}
                  </span>
                )}
              </div>

              {/* IMDb Badge & Link */}
              <div className="shrink-0" dir="ltr">
                {imdbUrlRef ? (
                  <a
                    href={imdbUrlRef}
                    onClick={(e) => safeOpenExternalLink(imdbUrlRef || '', e)}
                    target="_blank"
                    rel="noreferrer"
                    title="فتح في IMDb"
                    className="flex items-stretch bg-black/50 border border-yellow-500/40 hover:border-yellow-400 rounded-xl overflow-hidden shadow-md hover:shadow-yellow-500/20 transition-all duration-300 group select-none h-7 sm:h-8 cursor-pointer active:scale-95"
                  >
                    <div className="flex items-center justify-center px-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black font-en text-[10px] sm:text-xs tracking-wider select-none shrink-0">
                      IMDb
                    </div>
                    <div className="flex items-center gap-1 px-2 bg-white/5 border-l border-white/10">
                      <span className="text-[11px] sm:text-xs font-black font-en text-white tracking-tight leading-none drop-shadow-md">
                        {stars && stars !== '0' ? stars : '—'}
                      </span>
                      <i className="fa-solid fa-star text-amber-400 text-[9px] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300"></i>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-stretch bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-md select-none h-7 sm:h-8">
                    <div className="flex items-center justify-center px-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black font-en text-[10px] sm:text-xs tracking-wider select-none shrink-0">
                      IMDb
                    </div>
                    <div className="flex items-center gap-1 px-2 bg-white/5 border-l border-white/10">
                      <span className="text-[11px] sm:text-xs font-black font-en text-white tracking-tight leading-none drop-shadow-md">
                        {stars && stars !== '0' ? stars : '—'}
                      </span>
                      <i className="fa-solid fa-star text-amber-400 text-[9px]"></i>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {cleanSubtitle && (
              <h2 className="text-xs sm:text-sm text-gray-400 font-en font-bold opacity-80 mt-0.5 text-right" dir="ltr">
                {cleanSubtitle}
              </h2>
            )}

            {/* Metadata Inline Badges */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-400 font-bold mt-1" dir="rtl">
              {kind && (
                <span className="text-white bg-alex-primary px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-black select-none shadow-sm">
                  {isSeries ? 'مسلسل' : 'فيلم'}
                </span>
              )}
              {year && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] sm:text-xs text-gray-300">
                  <i className="fa-regular fa-calendar text-amber-400 text-[10px]"></i> {year}
                </span>
              )}
              {duration ? (() => {
                const totalMinutes = duration > 300 ? Math.round(duration / 60) : Math.round(duration);
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                const hoursText = hours > 0 ? (hours === 1 ? '1 ساعة' : hours === 2 ? 'ساعتان' : `${hours} ساعات`) : '';
                const minsText = mins > 0 ? `${mins} دقيقة` : '';
                const formattedDuration = hoursText && minsText ? `${hoursText} و ${minsText}` : (hoursText || minsText || `${totalMinutes} دقيقة`);
                return (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] sm:text-xs text-gray-300">
                    <i className="fa-regular fa-clock text-alex-primary text-[10px]"></i>
                    {formattedDuration}
                  </span>
                );
              })() : null}
              {itemDate && (
                <span className="flex items-center gap-1 text-gray-500 text-[10px] sm:text-xs">
                  <i className="fa-regular fa-clock text-[10px]"></i> أُضيف {itemDate.split(' ')[0]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ Section 2: Genre / Category Pills ═══════ */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2" dir="rtl">
            {categories.map((cat, index) => (
              <span
                key={cat.nb || index}
                className={`px-3 py-1 rounded-xl text-[11px] sm:text-xs font-black select-none tracking-wide cursor-pointer ${getSmartCategoryStyle(cat.ar_title)}`}
              >
                {cat.ar_title}
              </span>
            ))}
          </div>
        )}

        {/* ═══════ Section 3: Story / Synopsis ═══════ */}
        {content && (
          <div className="border-t border-white/10 pt-3.5 sm:pt-4 text-right" dir="rtl">
            <h3 className="text-sm sm:text-base font-black text-white mb-1.5 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
              القصة
            </h3>
            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm font-medium opacity-90">
              {content}
            </p>
          </div>
        )}

        {/* ═══════ Section 4: Directors & Writers ═══════ */}
        {((directorsInfo && directorsInfo.length > 0) || (writersInfo && writersInfo.length > 0)) && (
          <div className="pt-1 flex flex-wrap gap-x-6 gap-y-1.5" dir="rtl">
            {directorsInfo && directorsInfo.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-bold">الإخراج:</span>
                <span className="text-white font-en font-bold text-xs sm:text-sm">{directorsInfo.map((director) => director.name).join(' ، ')}</span>
              </div>
            )}
            {writersInfo && writersInfo.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-bold">التأليف:</span>
                <span className="text-white font-en font-bold text-xs sm:text-sm">{writersInfo.map((writer) => writer.name).join(' ، ')}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Section 5: Action Toolbar (favorites, share, voting, room) ═══════ */}
        <div className="pt-2 border-t border-white/10 w-full">
          {children}
        </div>

        {/* ═══════ Section 6: Cast Grid / Carousel ═══════ */}
        {actorsInfo && actorsInfo.length > 0 && (
          <div className="border-t border-white/10 pt-4 text-right w-full" dir="rtl">
            <h3 className="text-sm sm:text-base font-black text-white mb-3 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
              الطاقم
            </h3>
            <div className="flex sm:grid sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto scrollbar-none pb-2">
              {actorsInfo.map((actor, index) => (
                <ActorCard key={actor.nb || index} name={actor.name} img={actor.staff_img_thumb || actor.staff_img} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
