"use client";

import { usePathname } from 'next/navigation';
import React, { Suspense } from 'react';
import Sidebar from "@/components/Sidebar";

export default function ConditionalSidebar() {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/sign-in')
    || pathname?.startsWith('/sign-up')
    || pathname?.startsWith('/tg-app');

  if (isAuthPage) {
    return null; // No sidebar on auth pages
  }

  return (
    <Suspense fallback={null}>
      <Sidebar />
    </Suspense>
  );
}
