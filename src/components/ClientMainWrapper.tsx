"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function ClientMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullBleedPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app')
    || pathname?.startsWith('/room/');

  return (
    <main
      className={isFullBleedPage
        ? 'auth-main w-full flex-grow p-0 m-0 !p-0 !m-0 !pt-0 !pr-0 !pl-0 !pb-0'
        : 'flex-grow pt-16 sm:pt-20 xl:pt-0 xl:pr-20'}
    >
      {children}
    </main>
  );
}
