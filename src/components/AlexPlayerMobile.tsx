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

  const [isScrubbing, setIsScrubbing] = useState(false);

  // Bottom Sheets State
  const [activeSheet, setActiveSheet] = useState<'quality' | 'speed' | 'subtitles' | null>(null);

  // Subtitle custom sizing state with localstorage persistence
  const [subtitleSize, setSubtitleSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alex_subtitle_size');
      if (saved) {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 100;
  });

  useEffect(() => {
    localStorage.setItem('alex_subtitle_size', String(subtitleSize));
  }, [subtitleSize]);

  // Subtitle custom background state with localstorage persistence
  const [showSubtitleBg, setShowSubtitleBg] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alex_show_subtitle_bg');
      return saved !== 'false';
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem('alex_show_subtitle_bg', String(showSubtitleBg));
  }, [showSubtitleBg]);

  // Subtitle custom font state with localstorage persistence
  const [selectedFont, setSelectedFont] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alex_subtitle_font');
      if (saved) return saved;
    }
    return 'Tajawal';
  });

  useEffect(() => {
    localStorage.setItem('alex_subtitle_font', selectedFont);
  }, [selectedFont]);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('ar');

  // Sync Text Tracks (Subtitles)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const tracks = video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        if (selectedLanguage === 'off') {
          tracks[i].mode = 'hidden';
        } else if (tracks[i].language === selectedLanguage) {
          tracks[i].mode = 'showing';
        } else {
          tracks[i].mode = 'hidden';
        }
      }
    }
  }, [selectedLanguage, currentStreamUrl]);

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

  // Get Subtitle Track Files (Mapped to proxy and deduplicated)
  const getVttTracks = () => {
    const tracksMap = new Map<string, { id: string | number; name: string; type: string; file: string }>();
    const translations = videoData.translations || [];
    
    // 1. Process translations array
    if (translations && translations.length > 0) {
      translations.forEach((t) => {
        const fileUrl = t.file;
        const isVtt = t.extention === 'vtt' || fileUrl.includes('.vtt');
        const existing = tracksMap.get(t.type);
        if (!existing || isVtt) {
          tracksMap.set(t.type, {
            id: t.id,
            name: t.name,
            type: t.type,
            file: fileUrl
          });
        }
      });
    }

    // 2. Fallback to individual file paths
    if (tracksMap.size === 0) {
      if (videoData.arTranslationFilePath) {
        tracksMap.set('ar', { id: 'fallback-ar', name: 'arabic', type: 'ar', file: videoData.arTranslationFilePath });
      }
      if (videoData.enTranslationFilePath) {
        tracksMap.set('en', { id: 'fallback-en', name: 'english', type: 'en', file: videoData.enTranslationFilePath });
      }
    }
    return Array.from(tracksMap.values());
  };

  const vttTranslations = getVttTracks();

  // Sync Text Tracks (Subtitles)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const syncTracks = () => {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (selectedLanguage === 'off') {
            track.mode = 'disabled';
          } else if (track.language === selectedLanguage) {
            track.mode = 'showing';
          } else {
            track.mode = 'disabled';
          }
        }
      };

      syncTracks();
      video.addEventListener('play', syncTracks);
      video.addEventListener('loadedmetadata', syncTracks);
      video.addEventListener('loadeddata', syncTracks);
      if (video.textTracks) {
        video.textTracks.addEventListener('change', syncTracks);
      }

      return () => {
        video.removeEventListener('play', syncTracks);
        video.removeEventListener('loadedmetadata', syncTracks);
        video.removeEventListener('loadeddata', syncTracks);
        if (video.textTracks) {
          video.textTracks.removeEventListener('change', syncTracks);
        }
      };
    }
  }, [selectedLanguage, currentStreamUrl]);

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

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
      resetControlsTimeout();
      triggerHaptic('light');
    }
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
          className={`w-full h-full alex-video-cue transition-transform duration-300 ${isZoomed ? 'scale-[1.1] sm:scale-125 object-cover' : 'object-contain'}`}
          style={{ 
            filter: `brightness(${brightness})`,
            '--sub-size': `${subtitleSize}%`,
            '--sub-bg': showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent',
            '--sub-shadow': showSubtitleBg ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.95)',
            '--sub-font': `'${selectedFont}', 'Outfit', sans-serif`,
            '--sub-offset-y': isFullscreen ? (showControls ? '-10vh' : '-24px') : (showControls ? '-60px' : '-24px')
          } as React.CSSProperties}
          playsInline
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
          onTimeUpdate={() => {
            if (!isScrubbing) setCurrentTime(videoRef.current?.currentTime || 0);
          }}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        >
          {vttTranslations.map((track) => (
            <track
              key={track.id}
              kind="subtitles"
              src={track.file}
              srcLang={track.type}
              label={track.name === 'arabic' ? 'العربية' : 'English'}
              default={track.type === 'ar'}
            />
          ))}
        </video>
      </div>

      {/* Double Tap Seek Overlay */}
      {showSeekAnimation === 'forward' && (
        <div className="absolute right-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center animate-ping text-white text-2xl">
            <i className="fa-solid fa-forward"></i>
          </div>
          <span className="text-white font-black mt-4 text-sm drop-shadow-md">+10 ثوانٍ</span>
        </div>
      )}
      {showSeekAnimation === 'backward' && (
        <div className="absolute left-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center animate-ping text-white text-2xl">
            <i className="fa-solid fa-backward"></i>
          </div>
          <span className="text-white font-black mt-4 text-sm drop-shadow-md">-10 ثوانٍ</span>
        </div>
      )}

      {/* Zero-UI Overlay Controls (Liquid Glassmorphism) */}
      <div 
        className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-300 ${showControls || isPaused ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Top Gradient & Title */}
        <div className={`absolute top-0 left-0 w-full pt-4 sm:pt-6 px-4 sm:px-6 pb-12 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-all duration-300 flex items-center justify-start gap-3 ${showControls || isPaused ? 'pointer-events-auto translate-y-0' : 'pointer-events-none -translate-y-4'}`}>
          <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:bg-white/20 transition-all active:scale-90" onClick={() => window.history.back()}>
            <i className="fa-solid fa-arrow-right text-sm"></i>
          </button>
          <h2 className="text-white font-bold text-xs sm:text-sm max-w-[70%] truncate drop-shadow-md tracking-wide">
            {videoData.ar_title}
          </h2>
        </div>

        {/* Center Big Play Button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button 
            onClick={togglePlay}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center text-black text-xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] active:scale-90 transition-all duration-300 pointer-events-auto"
          >
            <i className={`fa-solid ${isPaused ? 'fa-play ml-1' : 'fa-pause'}`}></i>
          </button>
        </div>

        {/* Bottom Liquid Glass Controls */}
        <div className={`absolute bottom-0 left-0 w-full pb-2 px-4 sm:px-6 pt-12 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-all duration-300 ${showControls || isPaused ? 'pointer-events-auto translate-y-0' : 'pointer-events-none translate-y-4'}`}>
          
          {/* Smart Timeline Scrubber */}
          <div className="relative w-full h-6 flex items-center group mb-0" dir="ltr">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onPointerDown={() => setIsScrubbing(true)}
              onPointerUp={(e) => {
                setIsScrubbing(false);
                const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                if (videoRef.current) videoRef.current.currentTime = val;
                triggerHaptic('light');
              }}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCurrentTime(val);
                if (isPaused && videoRef.current) {
                  videoRef.current.currentTime = val;
                }
              }}
              className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer touch-none"
            />
            {/* Visual Track */}
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden relative transition-all duration-300 group-active:h-2">
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

            {/* Compact Thumb Zones for Actions */}
            <div className="flex items-center gap-1">
              <button onClick={() => setActiveSheet('speed')} className="w-10 h-10 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors font-en text-xs font-bold">
                {playbackRate}x
              </button>
              <button onClick={() => setActiveSheet('quality')} className="w-10 h-10 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors">
                <i className="fa-solid fa-sliders text-sm"></i>
              </button>
              <button onClick={() => setActiveSheet('subtitles')} className="w-10 h-10 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors">
                <i className="fa-solid fa-closed-captioning text-sm"></i>
              </button>
              <button 
                onClick={toggleFullscreen} 
                className="w-10 h-10 flex items-center justify-center text-white/90 hover:bg-white/10 rounded-full transition-colors"
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-sm`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popover Backdrop */}
      {activeSheet && (
        <div 
          className="absolute inset-0 z-[99998] bg-black/10" 
          onClick={() => setActiveSheet(null)}
          onTouchStart={() => setActiveSheet(null)}
        />
      )}

      {/* Floating Menus (Like Desktop) */}
      {activeSheet && (
        <div className="absolute bottom-[65px] sm:bottom-[70px] right-4 sm:right-6 z-[99999] pointer-events-auto" dir="rtl">
          {activeSheet === 'speed' && (
            <div className="w-[150px] bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
                 <div className="text-[10px] text-white font-black">سرعة التشغيل</div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-en">
                {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                  <button key={r} onClick={() => { setPlaybackRate(r); if(videoRef.current) videoRef.current.playbackRate = r; setActiveSheet(null); }} className={`py-1 rounded-lg text-xs font-bold transition-colors ${playbackRate === r ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{r}x</button>
                ))}
              </div>
            </div>
          )}

          {activeSheet === 'quality' && (
            <div className="w-[150px] bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
                 <div className="text-[10px] text-white font-black">جودة العرض</div>
              </div>
              <div className="flex flex-col gap-1 font-en max-h-[35vh] overflow-y-auto pr-1">
                <button onClick={() => { setSelectedResolution('Auto'); setActiveSheet(null); }} className={`py-1 px-3 rounded-lg text-[11px] font-bold text-center transition-colors ${selectedResolution === 'Auto' ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>Auto</button>
                {[...streams].sort((a, b) => parseInt(a.resolution) - parseInt(b.resolution)).map((s) => (
                  <button key={s.name} onClick={() => { setSelectedResolution(s.resolution); setCurrentStreamUrl(s.videoUrl || ''); setActiveSheet(null); }} className={`py-1 px-3 rounded-lg text-[11px] font-bold text-center transition-colors ${selectedResolution === s.resolution ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{s.resolution}</button>
                ))}
              </div>
            </div>
          )}

          {activeSheet === 'subtitles' && (
            <div className="w-[200px] bg-zinc-950/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
                 <div className="text-[10px] text-white font-black">إعدادات الترجمة</div>
              </div>
              
              <div className="max-h-[45vh] overflow-y-auto pr-1">
                <div className="text-[9px] text-gray-400 font-bold mb-1.5">لغة الترجمة</div>
                <div className="grid grid-cols-2 gap-1 mb-3">
                  <button onClick={() => { setSelectedLanguage('off'); setActiveSheet(null); }} className={`py-1 rounded-lg text-[11px] font-bold transition-colors ${selectedLanguage === 'off' ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>إيقاف</button>
                  {vttTranslations.map((track) => (
                    <button key={track.id} onClick={() => { setSelectedLanguage(track.type); setActiveSheet(null); }} className={`py-1 rounded-lg text-[11px] font-bold transition-colors ${selectedLanguage === track.type ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                      {track.name === 'arabic' ? 'العربية' : 'English'}
                    </button>
                  ))}
                </div>

                <div className="text-[9px] text-gray-400 font-bold mb-1.5">نوع الخط</div>
                <div className="grid grid-cols-3 gap-1 mb-3">
                  {['Tajawal', 'Cairo', 'Amiri'].map(f => (
                    <button key={f} onClick={() => setSelectedFont(f)} className={`py-1 rounded-lg text-[10px] font-bold transition-colors ${selectedFont === f ? 'bg-white/10 text-alex-primary border border-alex-primary/30 shadow-sm' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                      {f === 'Tajawal' ? 'تجول' : f === 'Cairo' ? 'القاهرة' : 'أميري'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between mb-3 bg-white/5 p-1.5 rounded-xl">
                  <div className="text-[9px] text-gray-400 font-bold">حجم الخط</div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setSubtitleSize(s => Math.max(50, s - 10))} className="w-5 h-5 flex items-center justify-center rounded-md bg-white/10 text-white font-bold hover:bg-white/20 active:scale-90">-A</button>
                    <span className="text-[10px] text-white font-bold min-w-[24px] text-center">{subtitleSize}%</span>
                    <button onClick={() => setSubtitleSize(s => Math.min(200, s + 10))} className="w-5 h-5 flex items-center justify-center rounded-md bg-white/10 text-white font-bold hover:bg-white/20 active:scale-90">+A</button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white/5 p-1.5 rounded-xl">
                  <div className="text-[9px] text-gray-400 font-bold">خلفية سوداء للترجمة</div>
                  <button onClick={() => setShowSubtitleBg(!showSubtitleBg)} className={`w-8 h-4 rounded-full relative transition-colors ${showSubtitleBg ? 'bg-alex-primary' : 'bg-white/20'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${showSubtitleBg ? 'left-0.5' : 'left-[18px]'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
