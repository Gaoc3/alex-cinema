import React from 'react';

interface MediaDetailsProps {
  title: string;
  enTitle?: string;
  year?: string;
  categories?: any[];
  duration?: number;
  stars?: string;
  content?: string;
  children?: React.ReactNode;
}

export default function MediaDetails({
  title, enTitle, year, categories, duration, stars, content, children
}: MediaDetailsProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-white/5 flex flex-col justify-between h-full">
      <div className="absolute top-0 right-0 w-64 h-64 bg-alex-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-2 tracking-tight drop-shadow-md">{title}</h1>
              {enTitle && (
                <h2 className="text-base md:text-lg text-gray-400 font-en font-bold opacity-80 text-left" dir="ltr">{enTitle} {year ? `(${year})` : ''}</h2>
              )}
              
              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                {categories?.map((cat: any, index: number) => (
                  <span key={cat.nb || index} className="bg-alex-primary/20 text-alex-primary border border-alex-primary/30 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{cat.ar_title}</span>
                ))}
                {duration ? (
                  <span className="bg-white/5 text-gray-200 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <i className="fa-regular fa-clock text-gray-400"></i> <span className="font-en">{Math.floor(duration / 60)}</span> دقيقة
                  </span>
                ) : null}
                {year && (
                  <span className="bg-white/5 text-gray-200 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <i className="fa-regular fa-calendar text-gray-400"></i> <span className="font-en">{year}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end shrink-0">
              <div className="flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1608] to-[#0a0803] border border-yellow-500/20 px-5 py-3.5 rounded-2xl shadow-[0_0_15px_rgba(234,179,8,0.08)]">
                <div className="flex items-center gap-2 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                  <i className="fa-solid fa-star text-xl"></i>
                  <span className="text-3xl font-black font-en leading-none">{stars || '0.0'}</span>
                </div>
                <span className="text-yellow-500/60 text-[10px] font-bold mt-1.5 uppercase tracking-wider">تقييم المشاهدين</span>
              </div>
            </div>
          </div>
          
          {content && (
            <div className="border-t pt-6 border-white/10">
              <h3 className="text-base md:text-lg font-black text-white mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5.5 bg-alex-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.4)]"></div> القصة
              </h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base font-medium opacity-90">
                {content}
              </p>
            </div>
          )}
        </div>
        
        {children}
      </div>
    </div>
  );
}
