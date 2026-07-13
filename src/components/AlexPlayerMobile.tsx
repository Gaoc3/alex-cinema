'use client';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';

export default function AlexCinemaPlayer({ videoData }: any) {
  // --- States ---
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ar');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>('Auto');
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  
  // Sheet States
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [sheetView, setSheetView] = useState<'main' | 'subtitles' | 'quality'>('main');
  
  const [isFamilyMode, setIsFamilyMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // --- Refs ---
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef<boolean>(false);

  // --- 1. Safe Time Formatter ---
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- 2. Auto-Hide Controls ---
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPaused && !activeSheet) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPaused, activeSheet]);

  useEffect(() => {
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPaused, activeSheet, resetControlsTimeout]);

  // --- 3. Fullscreen Logic ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!isFullscreen) {
      if (container.requestFullscreen) await container.requestFullscreen();
      else if ((container as any).webkitRequestFullscreen) (container as any).webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    }
  };

  // --- 4. Video Initialization & HLS ---
  useEffect(() => {
    if (!videoData) return;
    const preferred = videoData?.streams?.find((s: any) => s.resolution?.includes('1080')) 
                   || videoData?.streams?.find((s: any) => s.resolution?.includes('720')) 
                   || videoData?.streams?.[0];
                   
    setCurrentStreamUrl(preferred?.videoUrl || videoData.stream_url || null);
    setSelectedResolution(preferred?.resolution || 'Auto');
  }, [videoData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;

    if (currentStreamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(currentStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isPaused) video.play().catch(()=> setIsPaused(true));
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentStreamUrl;
      }
    } else {
      video.src = currentStreamUrl;
    }
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [currentStreamUrl]);

  // --- 5. Event Handlers ---
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
    resetControlsTimeout();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isScrubbing) return;
    const v = videoRef.current;
    setCurrentTime(v.currentTime);
    if (isFinite(v.duration) && v.duration > 0) setDuration(v.duration);

    // Family Mode Skip Logic
    if (isFamilyMode && videoData?.skippingDurations) {
      const { start, end } = videoData.skippingDurations;
      for (let i = 0; i < start.length; i++) {
        if (v.currentTime >= parseFloat(start[i]) && v.currentTime < parseFloat(end[i])) {
          v.currentTime = parseFloat(end[i]) + 0.1;
          return;
        }
      }
    }
  };

  const handleScrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  };

  // --- 6. Subtitles Engine ---
  const vttTracks = useMemo(() => {
    if (!videoData?.translations) return [];
    return videoData.translations.filter((t: any) => t.file && t.file.includes('.vtt'));
  }, [videoData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const syncTracks = () => {
      let activeText = '';
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (selectedLanguage === 'off') { track.mode = 'disabled'; continue; }
        if (track.language === selectedLanguage) {
          track.mode = 'hidden';
          if (track.activeCues?.length) {
            activeText = Array.from(track.activeCues).map((c: any) => c.text.replace(/<[^>]+>/g, '')).join('\n');
          }
        } else {
          track.mode = 'disabled';
        }
      }
      setCurrentSubtitle(activeText);
    };
    video.addEventListener('timeupdate', syncTracks);
    return () => video.removeEventListener('timeupdate', syncTracks);
  }, [selectedLanguage, vttTracks]);

  // --- Render ---
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={playerContainerRef}
      className="relative w-full aspect-video bg-black overflow-hidden font-sans text-white group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => { if (!isPaused) setShowControls(false); }}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onWaiting={() => { clearTimeout(waitingTimeoutRef.current!); waitingTimeoutRef.current = setTimeout(() => setIsWaiting(true), 300); }}
        onPlaying={() => { clearTimeout(waitingTimeoutRef.current!); setIsWaiting(false); setIsPaused(false); }}
        onPause={() => setIsPaused(true)}
      >
        {vttTracks.map((t: any) => <track key={t.id} kind="subtitles" srcLang={t.type} src={t.file} />)}
      </video>

      {/* Subtitles Overlay */}
      {currentSubtitle && (
        <div className="absolute bottom-28 left-0 right-0 flex justify-center pointer-events-none px-4 z-20">
          <p className="text-white text-center text-lg md:text-2xl font-bold bg-black/70 px-4 py-2 rounded-lg" dir="auto">
            {currentSubtitle}
          </p>
        </div>
      )}

      {/* Center Play Button */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-300 ${showControls || isPaused ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={togglePlay}
          className="w-20 h-20 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 pointer-events-auto transition-transform active:scale-90 outline-none"
        >
          {isPaused ? (
            <svg className="w-8 h-8 ml-1 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          ) : (
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          )}
        </button>
      </div>

      {/* Bottom Controls (Strict LTR Direction to fix UI bug) */}
      <div 
        dir="ltr"
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-4 left-4 right-4 bg-[#0f111a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3 z-40 transition-all duration-500 ${showControls || isPaused ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'}`}
      >
        {/* Timeline */}
        <div 
          className="relative w-full h-6 flex items-center cursor-pointer group/timeline touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsScrubbing(true);
            wasPlayingRef.current = !videoRef.current?.paused;
            videoRef.current?.pause();
            handleScrub(e);
          }}
          onPointerMove={(e) => { if (isScrubbing) handleScrub(e); }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsScrubbing(false);
            if (wasPlayingRef.current) videoRef.current?.play();
          }}
        >
          <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-visible">
            {/* Red Fill */}
            <div className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full pointer-events-none" style={{ width: `${progressPercent}%` }}></div>
            {/* Blue/Red Thumb */}
            <div 
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-lg pointer-events-none transition-transform duration-200 ${isScrubbing ? 'scale-125' : 'scale-0 group-hover/timeline:scale-100'}`}
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            ></div>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between w-full">
          {/* Left: Play, Mute, Time */}
          <div className="flex items-center gap-5">
            <button onClick={togglePlay} className="text-white hover:text-red-500 transition outline-none">
              {isPaused ? <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
            </button>
            <button onClick={toggleMute} className="text-white hover:text-red-500 transition outline-none">
              {isMuted ? <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> : <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
            </button>
            <span className="text-white/80 font-mono text-xs tracking-wider select-none">
              {formatTime(currentTime)} <span className="text-white/40 mx-1">/</span> {formatTime(duration)}
            </span>
          </div>

          {/* Right: Settings, Fullscreen */}
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveSheet('settings')} className="text-white hover:text-white transition outline-none">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            </button>
            <button onClick={toggleFullscreen} className="text-white hover:text-white transition outline-none">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-16 h-16 border-4 border-white/20 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Settings Modal (Strict RTL Structure) */}
      {activeSheet && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setActiveSheet(null); setSheetView('main'); }}
        >
          <div 
            dir="rtl"
            onClick={e => e.stopPropagation()}
            className="bg-[#161821] w-[90%] max-w-sm rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden text-white"
          >
            {/* Main Menu */}
            <div className={`transition-transform duration-300 w-full ${sheetView === 'main' ? 'translate-x-0' : 'translate-x-full absolute inset-0 invisible'}`}>
              <div className="flex flex-row justify-between items-center mb-6">
                 <h3 className="font-bold text-lg">الإعدادات</h3>
                 <button onClick={() => { setActiveSheet(null); setSheetView('main'); }} className="p-2 bg-white/5 rounded-full hover:bg-white/10 outline-none">
                   <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                 </button>
              </div>

              <div className="flex flex-row justify-between items-center bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex flex-row items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-600">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-sm">وضع العائلة</span>
                    <span className="text-xs text-white/50 mt-1">تخطي تلقائي للمقاطع المخلة</span>
                  </div>
                </div>
                <button onClick={() => setIsFamilyMode(!isFamilyMode)} className={`w-12 h-6 rounded-full relative transition-colors outline-none ${isFamilyMode ? 'bg-red-600' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${isFamilyMode ? 'left-1' : 'right-1'}`}></div>
                </button>
              </div>

              <div className="bg-white/5 rounded-xl flex flex-col">
                <button onClick={() => setSheetView('subtitles')} className="flex flex-row justify-between items-center p-4 border-b border-white/5 hover:bg-white/5 transition outline-none">
                  <div className="flex flex-row items-center gap-3">
                    <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>
                    <span className="font-bold text-sm">الترجمة</span>
                  </div>
                  <div className="flex flex-row items-center gap-2 text-sm text-white/50">
                    <span>{selectedLanguage === 'ar' ? 'العربية' : selectedLanguage === 'en' ? 'English' : 'إيقاف'}</span>
                    <span>&lt;</span>
                  </div>
                </button>
                <button onClick={() => setSheetView('quality')} className="flex flex-row justify-between items-center p-4 hover:bg-white/5 transition outline-none">
                  <div className="flex flex-row items-center gap-3">
                    <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                    <span className="font-bold text-sm">الجودة</span>
                  </div>
                  <div className="flex flex-row items-center gap-2 text-sm text-white/50">
                    <span>{selectedResolution}</span>
                    <span>&lt;</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Subtitles Menu */}
            <div className={`transition-transform duration-300 w-full ${sheetView === 'subtitles' ? 'translate-x-0' : '-translate-x-full absolute inset-0 invisible'}`}>
               <div className="flex flex-row justify-between items-center mb-6">
                 <button onClick={() => setSheetView('main')} className="p-2 bg-white/5 rounded-full hover:bg-white/10 outline-none">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                 </button>
                 <h3 className="font-bold text-lg">الترجمة</h3>
                 <div className="w-9 h-9"></div> {/* Spacer */}
              </div>
              <div className="flex flex-col gap-2">
                {['off', 'ar', 'en'].map(lang => (
                  <button 
                    key={lang}
                    onClick={() => { setSelectedLanguage(lang); setSheetView('main'); }} 
                    className={`flex flex-row items-center justify-between p-4 rounded-xl transition outline-none ${selectedLanguage === lang ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="font-bold text-sm text-right flex-1">{lang === 'off' ? 'إيقاف' : lang === 'ar' ? 'العربية' : 'English'}</span>
                    {selectedLanguage === lang && <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Menu */}
            <div className={`transition-transform duration-300 w-full ${sheetView === 'quality' ? 'translate-x-0' : '-translate-x-full absolute inset-0 invisible'}`}>
               <div className="flex flex-row justify-between items-center mb-6">
                 <button onClick={() => setSheetView('main')} className="p-2 bg-white/5 rounded-full hover:bg-white/10 outline-none">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                 </button>
                 <h3 className="font-bold text-lg">الجودة</h3>
                 <div className="w-9 h-9"></div> {/* Spacer */}
              </div>
              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
                {videoData?.streams?.map((stream: any, index: number) => (
                  <button 
                    key={index}
                    onClick={() => { setCurrentStreamUrl(stream.videoUrl); setSelectedResolution(stream.resolution); setSheetView('main'); }} 
                    className={`flex flex-row items-center justify-between p-4 rounded-xl transition outline-none ${selectedResolution === stream.resolution ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="font-bold text-sm text-right flex-1">{stream.resolution}</span>
                    {selectedResolution === stream.resolution && <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
