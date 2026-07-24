import React from 'react';

interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  accentColor?: 'primary' | 'blue' | 'orange' | 'purple';
}

export default function Pagination({ currentPage, onPageChange, hasNextPage, accentColor = 'primary' }: PaginationProps) {
  const colorStyles = {
    primary: {
      bg: 'bg-alex-primary',
      text: 'text-alex-primary',
      shadow: 'shadow-[0_0_15px_rgba(229,9,20,0.3)]',
      border: 'border-alex-primary',
      hover: 'hover:bg-alex-primary/90'
    },
    blue: {
      bg: 'bg-blue-600',
      text: 'text-blue-500',
      shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.3)]',
      border: 'border-blue-600',
      hover: 'hover:bg-blue-600/90'
    },
    orange: {
      bg: 'bg-orange-600',
      text: 'text-orange-500',
      shadow: 'shadow-[0_0_15px_rgba(234,88,12,0.3)]',
      border: 'border-orange-600',
      hover: 'hover:bg-orange-600/90'
    },
    purple: {
      bg: 'bg-purple-600',
      text: 'text-purple-500',
      shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.3)]',
      border: 'border-purple-600',
      hover: 'hover:bg-purple-600/90'
    }
  };

  const currentTheme = colorStyles[accentColor];

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-12 sm:mt-16 mb-8 w-full" dir="rtl">
      {/* Previous Button */}
      <button 
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
          currentPage > 1 
            ? 'bg-[#141722] hover:bg-[#E50914] text-white border border-white/5 shadow-lg' 
            : 'bg-[#141722]/40 text-gray-600 border border-white/5 cursor-not-allowed'
        }`}
      >
        <i className="fa-solid fa-arrow-right text-xs"></i>
        <span>السابقة</span>
      </button>
      
      {/* Current Page Display */}
      <div className="relative px-6 py-2 rounded-full font-black text-sm border border-white/5 bg-[#141722] shadow-xl text-center min-w-[50px] font-en text-[#E50914] drop-shadow-md">
        {currentPage}
      </div>

      {/* Next Button */}
      <button 
        onClick={() => hasNextPage && onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
          hasNextPage 
            ? 'bg-[#141722] hover:bg-[#E50914] text-white border border-white/5 shadow-lg' 
            : 'bg-[#141722]/40 text-gray-600 border border-white/5 cursor-not-allowed'
        }`}
      >
        <span>التالية</span>
        <i className="fa-solid fa-arrow-left text-xs"></i>
      </button>
    </div>
  );
}
