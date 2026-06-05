import React from 'react';

interface AdditionalInfoProps {
  kind: string;
  year?: string;
  duration?: number;
  itemDate?: string;
}

export default function AdditionalInfo({ kind, year, duration, itemDate }: AdditionalInfoProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-white/5 flex flex-col justify-between h-full">
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-alex-primary/5 rounded-full blur-[50px] pointer-events-none"></div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-white font-black text-lg mb-6 flex items-center gap-2.5">
            <i className="fa-solid fa-circle-info text-alex-primary"></i> 
            <span>معلومات إضافية</span>
          </h4>
          
          <ul className="space-y-4.5 text-sm font-medium">
            <li className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-gray-400">النوع</span>
              <span className="text-white font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">
                {kind === '1' ? 'فيلم' : 'مسلسل'}
              </span>
            </li>
            {year && (
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400">السنة</span>
                <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">{year}</span>
              </li>
            )}
            {duration ? (
              <li className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400">المدة</span>
                <span className="text-white font-bold font-en bg-white/5 border border-white/10 px-3 py-1 rounded-lg shadow-sm">{Math.floor(duration / 60)} دقيقة</span>
              </li>
            ) : null}
            {itemDate && (
              <li className="flex justify-between items-center pb-1">
                <span className="text-gray-400">تاريخ الإضافة</span>
                <span className="text-gray-300 font-bold font-en bg-black/20 border border-white/5 px-3 py-1 rounded-lg">
                  {itemDate.split(' ')[0]}
                </span>
              </li>
            )}
          </ul>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-gray-500 font-bold">
          <span>الحالة: متوفر للعرض</span>
          <span className="text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Ultra HD
          </span>
        </div>
      </div>
    </div>
  );
}
