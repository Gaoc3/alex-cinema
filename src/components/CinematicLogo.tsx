"use client";

import { useState } from "react";

export default function CinematicLogo() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  const alexText = "ALEX".split("");
  const cinemaText = "CINEMA".split("");

  return (
    <div 
      dir="ltr" 
      className="relative z-50 flex items-center justify-center py-2 cursor-pointer group" 
      onMouseMove={handleMouseMove}
    >
      {/* Base Layer (Slightly Dimmed) */}
      <div className="relative">
        <div className="flex items-center text-xl sm:text-2xl md:text-3xl font-black font-en tracking-wider">
          <div className="flex text-white/70">
            {alexText.map((letter, i) => (
              <span key={`alex-base-${i}`} className="inline-block">
                {letter}
              </span>
            ))}
          </div>
          <div className="flex text-[#E50914]/80">
            {cinemaText.map((letter, i) => (
              <span key={`cinema-base-${i}`} className="inline-block">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Spotlight Hover Layer (Vibrant) */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          maskImage: `radial-gradient(80px circle at ${mousePosition.x}px ${mousePosition.y}px, black 10%, transparent 80%)`,
          WebkitMaskImage: `radial-gradient(80px circle at ${mousePosition.x}px ${mousePosition.y}px, black 10%, transparent 80%)`,
        }}
      >
        <div className="flex items-center text-xl sm:text-2xl md:text-3xl font-black font-en tracking-wider">
          <div className="flex text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
            {alexText.map((letter, i) => (
              <span key={`alex-hover-${i}`} className="inline-block">
                {letter}
              </span>
            ))}
          </div>
          <div className="flex text-[#ff3333] drop-shadow-[0_0_15px_rgba(229,9,20,1)]">
            {cinemaText.map((letter, i) => (
              <span key={`cinema-hover-${i}`} className="inline-block">
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
