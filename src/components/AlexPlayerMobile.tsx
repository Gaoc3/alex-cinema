'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';

interface Stream {
  name: string;
  resolution: string;
  container: string;
  videoUrl?: string | null;
}

interface Translation {
  id: number;
  name: string;
  type: string; // 'ar', 'en'
  extention: string; // 'srt', 'vtt'
  file: string;
}

interface AlexPlayerMobileProps {
  videoData: {
    trailer?: string;
    stream_url?: string | null;
    ar_title?: string;
    streams?: Stream[];
    translations?: Translation[];
    duration?: string | number | null;
    arTranslationFilePath?: string | null;
    enTranslationFilePath?: string | null;
  };
  onNextEpisode?: () => void;
}

export default function AlexPlayerMobile({ videoData, onNextEpisode }: AlexPlayerMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streams = videoData.streams || [];
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(videoData.stream_url || null);
  const [selectedResolution, setSelectedResolution] = useState<string>('Auto');
  
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(1); // 0.2 to 1
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bottom Sheets State
  const [activeSheet, setActiveSheet] = useState<'quality' | 'speed' | 'subtitles' | null>(null);

  // Subtitles
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ar');
  const [subtitleSize, setSubtitleSize] = useState<number>(100);
  const [showSubtitleBg, setShowSubtitleBg] = useState<boolean>(true);

  // Gestures
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const [showSeekAnimation, setShowSeekAnimation] = useState<'forward' | 'backward' | null>(null);
  const lastTapRef = useRef<{time: number}>({time: 0});
  
  // Ambient Color
  const [ambientColor, setAmbientColor] = useState('rgba(0,0,0,0)');

  // 1. Haptics
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'seek') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'heavy') navigator.vibrate(40);
      else if (type === 'seek') navigator.vibrate([20, 30, 20]);
    }
  }, []);

  // 2. Zero-UI auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPaused && !activeSheet) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPaused, activeSheet]);

  useEffect(() => {
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPaused, activeSheet, resetControlsTimeout]);

  // Sync stream url when videoData changes
  useEffect(() => {
    if (videoData.streams && videoData.streams.length > 0) {
      const preferred = videoData.streams.find((s: any) => s.resolution && s.resolution.toLowerCase().includes('1080')) 
                     || videoData.streams.find((s: any) => s.resolution && s.resolution.toLowerCase().includes('720')) 
                     || videoData.streams[0];
      setCurrentStreamUrl(preferred?.videoUrl || null);
      setSelectedResolution(preferred?.resolution || 'Auto');
    } else {
      setCurrentStreamUrl(videoData.stream_url || null);
      setSelectedResolution('Auto');
    }
    setIsPaused(true);
    setCurrentTime(0);
    setDuration(videoData.duration ? parseFloat(String(videoData.duration)) || 0 : 0);
  }, [videoData]);

  // 3. HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;

    if (currentStreamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
        hlsRef.current = hls;
        hls.loadSource(currentStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isPaused) video.play().catch(console.error);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentStreamUrl;
      }
    } else {
      video.src = currentStreamUrl;
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [currentStreamUrl]);

  // 4. Ambient Cinematic Glow Extraction
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && !video.paused && !video.ended) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = 64;
          canvas.height = 36;
          ctx.drawImage(video, 0, 0, 64, 36);
          try {
            const imageData = ctx.getImageData(0, 0, 64, 10).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < imageData.length; i += 16) {
              r += imageData[i];
              g += imageData[i + 1];
              b += imageData[i + 2];
              count++;
            }
            if (count > 0) {
              setAmbientColor(`rgba(${~~(r / count)}, ${~~(g / count)}, ${~~(b / count)}, 0.6)`);
            }
          } catch(e) {}
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 5. Gestures (Volume, Brightness, Double Tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    resetControlsTimeout();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length > 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    
    // Vertical swipe for Volume/Brightness
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      const isRightSide = touchStartRef.current.x > window.innerWidth / 2;
      const change = dy > 0 ? -0.02 : 0.02; // Down is negative, Up is positive
      
      if (isRightSide) {
        // Volume
        const newVol = Math.max(0, Math.min(1, volume + change));
        setVolume(newVol);
        if (videoRef.current) videoRef.current.volume = newVol;
      } else {
        // Brightness filter
        const newBright = Math.max(0.2, Math.min(1, brightness + change));
        setBrightness(newBright);
      }
      touchStartRef.current.y = touch.clientY; // reset origin for continuous swipe
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const now = Date.now();
    const dt = now - touchStartRef.current.time;
    
    // Detect Tap vs Swipe
    if (dt < 250) {
      const touchEndX = e.changedTouches[0].clientX;
      const dx = Math.abs(touchEndX - touchStartRef.current.x);
      
      if (dx < 10) {
        // Double tap detection
        const tapDelay = now - lastTapRef.current.time;
        if (tapDelay < 300) {
          // It's a double tap
          triggerHaptic('seek');
          const isRight = touchEndX > window.innerWidth / 2;
          if (videoRef.current) {
            videoRef.current.currentTime += isRight ? 10 : -10;
            setShowSeekAnimation(isRight ? 'forward' : 'backward');
            setTimeout(() => setShowSeekAnimation(null), 600);
          }
          lastTapRef.current.time = 0; // reset
        } else {
          // Single tap -> Toggle controls
          lastTapRef.current.time = now;
          if (!activeSheet) {
            setShowControls(prev => !prev);
            triggerHaptic('light');
          }
        }
      }
    }
    touchStartRef.current = null;
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {}
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (err) {}
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('medium');
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
    resetControlsTimeout();
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video sm:h-full bg-black overflow-hidden select-none font-ar ${isFullscreen ? 'fixed inset-0 z-[9999] !h-[100dvh]' : 'max-h-[85dvh]'}`}
      style={{ '--ambient-color': ambientColor } as any}
    >
      {/* Cinematic Ambient Glow */}
      <div className="absolute inset-0 scale-110 blur-[80px] opacity-50 bg-[var(--ambient-color)] transition-colors duration-1000 z-0 pointer-events-none"></div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Container with Pinch to Zoom fluid aspect ratio */}
      <div 
        className="absolute inset-0 z-10 flex items-center justify-center transition-all duration-300"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          className={`w-full h-full transition-all duration-300 ${isZoomed ? 'object-cover' : 'object-contain'}`}
          style={{ filter: `brightness(${brightness})` }}
          playsInline
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        />
      </div>

      {/* Double Tap Seek Overlay */}
      {showSeekAnimation === 'forward' && (
        <div className="absolute right-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center animate-ping text-white text-3xl">
            <i className="fa-solid fa-forward"></i>
          </div>
          <span className="text-white font-black mt-4 text-sm drop-shadow-md">+10</span>
        </div>
      )}
      {showSeekAnimation === 'backward' && (
        <div className="absolute left-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center animate-ping text-white text-3xl">
            <i className="fa-solid fa-backward"></i>
          </div>
          <span className="text-white font-black mt-4 text-sm drop-shadow-md">-10</span>
        </div>
      )}

      {/* Zero-UI Overlay Controls (Liquid Glassmorphism) */}
      <div 
        className={`absolute inset-0 z-30 flex flex-col justify-between pointer-events-none transition-opacity duration-300 ${showControls || isPaused ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Top Gradient & Title */}
        <div className="w-full pt-4 px-4 sm:px-6 pb-10 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-auto flex items-center justify-between">
          <button className="p-3 text-white/90 hover:text-white transition-colors" onClick={() => window.history.back()}>
            <i className="fa-solid fa-chevron-right text-xl"></i>
          </button>
          <h2 className="text-white font-bold text-lg max-w-[70%] truncate text-center drop-shadow-md tracking-wide">
            {videoData.ar_title}
          </h2>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>

        {/* Center Big Play/Pause Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button 
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white text-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-75 transition-transform duration-300 pointer-events-auto"
          >
            <i className={`fa-solid ${isPaused ? 'fa-play ml-1' : 'fa-pause'} `}></i>
          </button>
        </div>

        {/* Bottom Liquid Glass Controls */}
        <div className="w-full pb-6 px-4 sm:px-6 pt-12 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-auto">
          
          {/* Smart Timeline Scrubber */}
          <div className="relative w-full h-10 flex items-center group mb-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (videoRef.current) videoRef.current.currentTime = val;
              }}
              className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer"
            />
            {/* Visual Track */}
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative transition-all duration-300 group-active:h-3">
              <div 
                className="absolute left-0 top-0 bottom-0 bg-alex-primary rounded-full"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="tabular-nums font-mono text-[11px] font-bold text-white/90">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            {/* 48x48 Thumb Zones for Actions */}
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveSheet('speed')} className="p-3 w-12 h-12 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors font-en text-xs font-bold">
                {playbackRate}x
              </button>
              <button onClick={() => setActiveSheet('quality')} className="p-3 w-12 h-12 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors">
                <i className="fa-solid fa-sliders text-sm"></i>
              </button>
              <button onClick={() => setActiveSheet('subtitles')} className="p-3 w-12 h-12 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors">
                <i className="fa-solid fa-closed-captioning text-sm"></i>
              </button>
              <button 
                onClick={toggleFullscreen} 
                className="p-3 w-12 h-12 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors"
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-sm`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spring Physics Bottom Sheets */}
      {activeSheet && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setActiveSheet(null)}></div>
          
          <div className="relative w-full bg-zinc-950/90 backdrop-blur-3xl rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom,16px)+24px)] flex flex-col gap-4 animate-[slideUp_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-2"></div>
            
            {activeSheet === 'speed' && (
              <>
                <h3 className="text-white font-black text-lg mb-2">سرعة التشغيل</h3>
                <div className="grid grid-cols-5 gap-2 font-en">
                  {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                    <button key={r} onClick={() => { setPlaybackRate(r); if(videoRef.current) videoRef.current.playbackRate = r; setActiveSheet(null); }} className={`p-4 rounded-2xl text-sm font-bold ${playbackRate === r ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{r}x</button>
                  ))}
                </div>
              </>
            )}

            {activeSheet === 'quality' && (
              <>
                <h3 className="text-white font-black text-lg mb-2">جودة العرض</h3>
                <div className="grid grid-cols-2 gap-3 font-en">
                  <button onClick={() => { setSelectedResolution('Auto'); setActiveSheet(null); }} className={`p-4 rounded-2xl text-sm font-bold ${selectedResolution === 'Auto' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>Auto</button>
                  {streams.map((s) => (
                    <button key={s.name} onClick={() => { setSelectedResolution(s.resolution); setCurrentStreamUrl(s.videoUrl || ''); setActiveSheet(null); }} className={`p-4 rounded-2xl text-sm font-bold ${selectedResolution === s.resolution ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{s.resolution}</button>
                  ))}
                </div>
              </>
            )}

            {activeSheet === 'subtitles' && (
              <>
                <h3 className="text-white font-black text-lg mb-2">إعدادات الترجمة</h3>
                {/* Simplified Subtitle UI for 2026 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button onClick={() => { setSelectedLanguage('off'); setActiveSheet(null); }} className={`p-4 rounded-2xl text-sm font-bold ${selectedLanguage === 'off' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>إيقاف</button>
                  <button onClick={() => { setSelectedLanguage('ar'); setActiveSheet(null); }} className={`p-4 rounded-2xl text-sm font-bold ${selectedLanguage === 'ar' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>العربية</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Global CSS for the Bottom Sheet Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
