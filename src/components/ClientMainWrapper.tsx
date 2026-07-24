"use client";

import { usePathname } from 'next/navigation';
import React from 'react';

export default function ClientMainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up');

  return (
    <main className={`flex-grow pt-16 sm:pt-20 xl:pt-0 ${isAuthPage ? '' : 'xl:pr-72'}`}>
      {children}
    </main>
  );
}
