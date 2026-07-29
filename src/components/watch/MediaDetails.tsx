import React from 'react';

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
    <div className="flex flex-col items-center text-center gap-2.5 group select-none min-w-0 w-full transition-all duration-300 hover:-translate-y-1">
      {img && !imgFailed ? (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-white/10 group-hover:border-alex-primary group-hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-500 shadow-xl shrink-0">
          <img
            src={img}
            alt={name}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-alex-primary group-hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-500 shadow-inner shrink-0">
          <i className="fa-solid fa-user text-gray-500 text-2xl sm:text-3xl group-hover:text-white transition-colors duration-300"></i>
        </div>
      )}
      <div className="flex flex-col min-w-0 items-center w-full">
        <span className="text-white font-en font-black text-xs md:text-sm tracking-tight leading-snug group-hover:text-alex-primary transition-colors duration-300 text-center break-words max-w-[110px]">
          {name}
        </span>
        <span className="text-gray-500 text-[10px] md:text-[11px] font-bold mt-1">ممثل</span>
      </div>
    </div>
  );
};

export default function MediaDetails({
  title, enTitle, episodeNum, seasonNum, year, categories, duration, stars, content, actorsInfo, directorsInfo, writersInfo, kind, itemDate, children
}: MediaDetailsProps) {
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

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5 flex flex-col h-full">
      <div className="relative z-10 w-full flex flex-col gap-6">

        {/* ═══════ Section 1: Title row — RIGHT: Badges & Title | LEFT: IMDb ═══════ */}
        <div className="w-full" dir="rtl">
          <div className="flex items-center justify-between gap-4 mb-1.5 flex-wrap">
            {/* RIGHT side: Title + Season + Episode (ordered RTL → Title far-right, badges left of it) */}
            <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1 justify-start">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-md text-right">
                {title}
              </h1>
              {(episodeNum || seasonNum) && <span className="text-white/20 font-bold text-lg select-none shrink-0">•</span>}
              {seasonNum && (
                <span className="bg-white text-black px-3 py-1 rounded-xl text-xs font-black shadow-md select-none shrink-0">
                  الموسم {seasonNum}
                </span>
              )}
              {episodeNum && (
                <span className="bg-alex-primary text-white px-3 py-1 rounded-xl text-xs font-black shadow-[0_0_15px_rgba(229,9,20,0.4)] select-none shrink-0">
                  الحلقة {episodeNum}
                </span>
              )}
            </div>

            {/* LEFT side: IMDb Badge */}
            <div className="shrink-0" dir="ltr">
              <div className="flex items-stretch bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl hover:border-white/20 transition-all duration-300 group select-none h-9">
                <div className="flex items-center justify-center px-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black font-en text-xs tracking-wider select-none shrink-0">
                  IMDb
                </div>
                <div className="flex items-center gap-1.5 px-3 bg-white/5 border-l border-white/10">
                  <span className="text-sm font-black font-en text-white tracking-tight leading-none drop-shadow-md">{stars || '0.0'}</span>
                  <i className="fa-solid fa-star text-amber-400 text-[10px] group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300"></i>
                </div>
              </div>
            </div>
          </div>

          {cleanSubtitle && (
            <h2 className="text-xs md:text-sm text-gray-400 font-en font-bold opacity-80 mt-1 text-right" dir="ltr">
              {cleanSubtitle}
            </h2>
          )}
        </div>

        {/* ═══════ Section 2: Metadata — RIGHT: type+year+duration | LEFT: date ═══════ */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-gray-400 font-bold" dir="rtl">
          <div className="flex items-center gap-x-4 gap-y-1.5 flex-wrap">
            {kind && (
              <span className="text-white bg-alex-primary/90 px-2.5 py-0.5 rounded-lg text-[10px] font-black select-none">
                {isSeries ? 'مسلسل' : 'فيلم'}
              </span>
            )}
            {year && (
              <span className="flex items-center gap-1.5">
                <i className="fa-regular fa-calendar text-amber-400 text-[10px]"></i> {year}
              </span>
            )}
            {duration ? (
              <span className="flex items-center gap-1.5">
                <i className="fa-regular fa-clock text-alex-primary text-[10px]"></i>
                {Math.floor(duration / 60)} ساعة {duration % 60 > 0 ? `${duration % 60} دقيقة` : ''}
              </span>
            ) : null}
          </div>
          {itemDate && (
            <span className="flex items-center gap-1.5 text-gray-500">
              <i className="fa-regular fa-clock text-[10px]"></i> أُضيف {itemDate.split(' ')[0]}
            </span>
          )}
        </div>

        {/* ═══════ Section 3: Genre / Category Pills (RTL flow) ═══════ */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2" dir="rtl">
            {categories.map((cat, index) => (
              <span
                key={cat.nb || index}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black select-none tracking-wide cursor-pointer ${getSmartCategoryStyle(cat.ar_title)}`}
              >
                {cat.ar_title}
              </span>
            ))}
          </div>
        )}

        {/* ═══════ Section 4: Story / Synopsis ═══════ */}
        {content && (
          <div className="border-t border-white/5 pt-5 text-right" dir="rtl">
            <h3 className="text-base md:text-lg font-black text-white mb-2.5 flex items-center gap-2">
              <div className="w-1.5 h-5 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.4)]"></div>
              القصة
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base font-medium opacity-90">
              {content}
            </p>
          </div>
        )}

        {/* ═══════ Section 5: Directors & Writers ═══════ */}
        {((directorsInfo && directorsInfo.length > 0) || (writersInfo && writersInfo.length > 0)) && (
          <div className="pt-2 flex flex-wrap gap-x-8 gap-y-2" dir="rtl">
            {directorsInfo && directorsInfo.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-bold">الإخراج:</span>
                <span className="text-white font-en font-bold text-sm">{directorsInfo.map((director) => director.name).join(' ، ')}</span>
              </div>
            )}
            {writersInfo && writersInfo.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-bold">التأليف:</span>
                <span className="text-white font-en font-bold text-sm">{writersInfo.map((writer) => writer.name).join(' ، ')}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Section 6: Action Toolbar (favorites, share, etc.) ═══════ */}
        <div className="pt-2 w-full flex justify-end">
          {children}
        </div>

        {/* ═══════ Section 7: Full Cast Grid ═══════ */}
        {actorsInfo && actorsInfo.length > 0 && (
          <div className="border-t border-white/5 pt-5 text-right w-full" dir="rtl">
            <h3 className="text-base md:text-lg font-black text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-5 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.4)]"></div>
              الطاقم
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-x-4 gap-y-7 justify-items-center justify-center">
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
