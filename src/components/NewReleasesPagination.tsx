'use client';
import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Pagination from './Pagination';

interface Props {
  currentPage: number;
  hasNextPage: boolean;
  accentColor?: 'primary' | 'blue' | 'orange' | 'purple';
}

export default function NewReleasesPagination({ currentPage, hasNextPage, accentColor = 'orange' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageChange = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNum.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Pagination 
      currentPage={currentPage} 
      onPageChange={handlePageChange} 
      hasNextPage={hasNextPage} 
      accentColor={accentColor} 
    />
  );
}
