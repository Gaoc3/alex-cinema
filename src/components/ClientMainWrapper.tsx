"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function ClientMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app');

  return (
    <main
      className={isAuthPage
        ? 'auth-main flex-grow'
        : 'flex-grow pt-16 sm:pt-20 xl:pt-0 xl:pr-72'}
    >
      {children}
    </main>
  );
}
