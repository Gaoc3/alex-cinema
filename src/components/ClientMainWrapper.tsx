"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function ClientMainWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app');
  const isRoomPage = pathname?.startsWith('/room/');

  return (
    <main
      className={isAuthPage
        ? 'auth-main w-full flex-grow p-0 m-0 !p-0 !m-0 !pt-0 !pr-0 !pl-0 !pb-0'
        : isRoomPage
          ? 'min-w-0 flex-grow'
        : 'flex-grow pt-16 sm:pt-20 xl:pt-0 xl:pr-20'}
    >
      {children}
    </main>
  );
}
