'use client';

import React, { useEffect } from 'react';

export default function SecurityWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return () => {
      return;
    };
  }, []);

  return <>{children}</>;
}

