'use client';

import React from 'react';
import DesktopSearchBar from './DesktopSearchBar';
import MobileSearchBar from './MobileSearchBar';

export default function SearchBar() {
  return (
    <>
      <div className="hidden xl:block">
        <DesktopSearchBar />
      </div>
      <div className="xl:hidden">
        <MobileSearchBar />
      </div>
    </>
  );
}

