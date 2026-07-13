'use client';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';

export default function AlexPlayerMobile({ videoData }: any) {
  // --- States ---
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ar');
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>('Auto');
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  
  // Sheet States
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [sheetView, setSheetView] = useState<'main' | 'subtitles' | 'quality'>('main');
  
  const [isFamilyMode, setIsFamilyMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  // --- Refs ---
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null); 
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTimeRef = useRef<number>(0);
  const initialTimeRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false); 
  const qualitySwitchTimeRef = useRef<number | null>(null);

  // --- Gestures Engine ---
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const [showSeekAnimation, setShowSeekAnimation] = useState<'forward' | 'backward' | null>(null);
  const lastTapRef = useRef<{time: number}>({time: 0});
  const [seekAmount, setSeekAmount] = useState(0);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Smart Layout Engine ---
  const [smartLayout, setSmartLayout] = useState({ playBtnOuter: 80, playBtnInner: 56, pillMargin: 16 });
  const [ambientColor, setAmbientColor] = useState('rgba(0,0,0,0)');

  // 1. Layout Calculation
  useEffect(() => {
    const calculateSmartLayout = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      const diag = Math.sqrt(w*w + h*h);
      const scale = Math.max(0.7, Math.min(1.5, diag / 800));
      setSmartLayout({
        playBtnOuter: isLandscape ? 70 * scale : 90 * scale,
        playBtnInner: isLandscape ? 50 * scale : 65 * scale,
        pillMargin: isLandscape ? Math.max(12, w * 0.05) : Math.max(16, w * 0.03),
      });
    };
    calculateSmartLayout();
    window.addEventListener('resize', calculateSmartLayout);
    return () => window.removeEventListener('resize', calculateSmartLayout);
  }, []);

  // 2. Fullscreen Sync
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

  // 3. Screen Wake Lock API (منع إطفاء الشاشة)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible' && !isPaused) {
        requestWakeLock();
      }
    };

    if (!isPaused) { requestWakeLock(); }
    else if (wakeLock !== null) { wakeLock.release(); wakeLock = null; }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (wakeLock !== null) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPaused]);

  // 4. Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (videoRef.current.paused) videoRef.current.play().catch(()=>{});
          else videoRef.current.pause();
          resetControlsTimeout();
          break;
        case 'arrowright':
          videoRef.current.currentTime += 10;
          resetControlsTimeout();
          break;
        case 'arrowleft':
          videoRef.current.currentTime -= 10;
          resetControlsTimeout();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          videoRef.current.muted = !videoRef.current.muted;
          resetControlsTimeout();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 5. Haptics
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'seek') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'seek') navigator.vibrate([20, 30, 20]);
    }
  }, []);

  // 6. Zero-UI Auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isPaused && !activeSheet) {
      controlsTimeoutRef.current = setTimeout(() => { setShowControls(false); }, 3000);
    }
  }, [isPaused, activeSheet]);

  useEffect(() => {
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPaused, activeSheet, resetControlsTimeout]);

  // 7. Initialize Video Data
  useEffect(() => {
    if (!videoData) return;
    if (videoData?.streams?.length > 0) {
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
    setDuration(videoData.duration ? parseFloat(String(videoData.duration)) || 0 : 0);
  }, [videoData]);

  // 8. HLS Setup & Auto-Recovery
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;
    
    let savedProgress = 0;
    try {
      if (typeof window !== 'undefined' && videoData?.nb) {
        const saved = localStorage.getItem(`alex_progress_${videoData.nb}`);
        if (saved) savedProgress = parseFloat(saved);
      }
    } catch (e) {}

    const exactTargetTime = qualitySwitchTimeRef.current !== null ? qualitySwitchTimeRef.current : (savedProgress > 5 ? savedProgress : -1);
    initialTimeRef.current = exactTargetTime;

    if (currentStreamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ startPosition: exactTargetTime });
        hlsRef.current = hls;
        
        hls.on(Hls.Events.ERROR, function (event, data) {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hls.loadSource(currentStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (video.autoplay || !isPaused || qualitySwitchTimeRef.current !== null) {
            video.play().catch(() => setIsPaused(true));
          }
          qualitySwitchTimeRef.current = null; 
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentStreamUrl;
      }
    } else {
      video.src = currentStreamUrl;
    }
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, [currentStreamUrl, videoData?.nb]);

  // 9. Subtitles Engine
  const vttTracks = useMemo(() => {
    const tracksMap = new Map<string, any>();
    if (videoData?.translations) {
      videoData.translations.forEach((t: any) => {
        if (t.file && (t.extention === 'vtt' || t.file.includes('.vtt'))) {
          tracksMap.set(t.type, t);
        }
      });
    }
    return Array.from(tracksMap.values());
  }, [videoData?.translations]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncTracks = () => {
      let newActiveText = '';
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (selectedLanguage === 'off') {
          track.mode = 'disabled';
        } else if (track.language === selectedLanguage) {
          track.mode = 'hidden';
          if (track.activeCues && track.activeCues.length > 0) {
            newActiveText = Array.from(track.activeCues)
              .map((c: any) => c.text.replace(/<[^>]+>/g, '')) 
              .join('\n');
          }
        } else {
          track.mode = 'disabled';
        }
      }
      setCurrentSubtitle(newActiveText);
    };

    syncTracks();
    const onCueChange = () => syncTracks();
    
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].addEventListener('cuechange', onCueChange);
    }
    video.addEventListener('timeupdate', syncTracks);

    return () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener('cuechange', onCueChange);
      }
      video.removeEventListener('timeupdate', syncTracks);
    };
  }, [selectedLanguage, currentStreamUrl, vttTracks]);

  // 10. Ambient Glow Extract
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!video || !canvas || !ctx) return;

    const interval = setInterval(() => {
      if (!document.hidden && !video.paused && !video.ended) {
        try {
          ctx.drawImage(video, 0, 0, 64, 36);
          const imageData = ctx.getImageData(0, 0, 64, 10).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < imageData.length; i += 16) {
            r += imageData[i]; g += imageData[i + 1]; b += imageData[i + 2]; count++;
          }
          if (count > 0) setAmbientColor(`rgba(${~~(r / count)}, ${~~(g / count)}, ${~~(b / count)}, 0.6)`);
        } catch(e) {}
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 11. Core Video Controls
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
    resetControlsTimeout();
  };

  const handleWaiting = () => {
    if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
    waitingTimeoutRef.current = setTimeout(() => setIsWaiting(true), 300);
  };

  const handlePlaying = () => {
    if (waitingTimeoutRef.current) clearTimeout(waitingTimeoutRef.current);
    setIsWaiting(false);
  };

  // حماية وتأمين دالة حساب الوقت من قيم NaN أو Infinity
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time) || time < 0) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const actDuration = videoRef.current.duration;
      if (isFinite(actDuration) && actDuration > 0) {
         setDuration(actDuration);
         if (timeDisplayRef.current) {
            timeDisplayRef.current.innerHTML = `${formatTime(videoRef.current.currentTime)} <span class="text-white/40">/</span> ${formatTime(actDuration)}`;
         }
      }
      if (initialTimeRef.current !== -1 && !hlsRef.current) {
         videoRef.current.currentTime = initialTimeRef.current;
         qualitySwitchTimeRef.current = null;
      }
      setIsMuted(videoRef.current.muted);
    }
  };

  // 12. Time Update (Zero-Render Optimization & Clamp Logic)
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (!isScrubbing && isFinite(duration) && duration > 0) {
      const percentage = Math.max(0, Math.min(100, (video.currentTime / duration) * 100));
      if (progressBarRef.current) progressBarRef.current.style.width = `${percentage}%`;
      if (thumbRef.current) {
        const safeLeft = Math.min(Math.max(percentage, 1), 99);
        thumbRef.current.style.left = `${safeLeft}%`;
      }
      
      if (timeDisplayRef.current) {
        timeDisplayRef.current.innerHTML = `${formatTime(video.currentTime)} <span class="text-white/40">/</span> ${formatTime(duration)}`;
      }
    }

    const now = Date.now();
    if (now - lastSavedTimeRef.current > 3000) {
      lastSavedTimeRef.current = now;
      try {
        if (videoData?.nb && video.currentTime > 5) {
          if (duration > 0 && video.currentTime / duration > 0.97) {
            localStorage.removeItem(`alex_progress_${videoData.nb}`);
          } else {
            localStorage.setItem(`alex_progress_${videoData.nb}`, String(video.currentTime));
          }
        }
      } catch (e) {}
    }

    if (isFamilyMode && videoData?.skippingDurations) {
      const { start, end } = videoData.skippingDurations;
      for (let i = 0; i < start.length; i++) {
        if (video.currentTime >= parseFloat(start[i]) && video.currentTime < parseFloat(end[i])) {
          video.currentTime = parseFloat(end[i]) + 0.1;
          return;
        }
      }
    }
  };

  // 13. Gestures Engine (Double Tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    resetControlsTimeout();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if ((e.target as HTMLElement).closest('button, .pointer-events-auto, .bottom-sheet, .scrubber-area')) {
       touchStartRef.current = null;
       return;
    }

    const dt = Date.now() - touchStartRef.current.time;
    if (dt < 250) {
      const touchX = e.changedTouches[0].clientX;
      const dx = Math.abs(touchX - touchStartRef.current.x);
      
      if (dx < 15) {
        const tapDelay = Date.now() - lastTapRef.current.time;
        if (tapDelay < 400) { 
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relativeX = touchX - rect.left;
          const third = rect.width / 3;

          if (relativeX < third || relativeX > third * 2) {
            const isForward = relativeX > third * 2;
            triggerHaptic('seek');
            
            if (videoRef.current) {
              videoRef.current.currentTime += isForward ? 10 : -10;
              if (timeDisplayRef.current && duration > 0) {
                 timeDisplayRef.current.innerHTML = `${formatTime(videoRef.current.currentTime)} <span class="text-white/40">/</span> ${formatTime(duration)}`;
              }
            }
            
            setSeekAmount(prev => {
              const sign = isForward ? 1 : -1;
              return (Math.sign(prev) !== sign && prev !== 0) ? sign * 10 : prev + (sign * 10);
            });

            setShowSeekAnimation(isForward ? 'forward' : 'backward');
            if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
            seekTimeoutRef.current = setTimeout(() => {
              setSeekAmount(0);
              setShowSeekAnimation(null);
            }, 700);
          } else {
            setIsZoomed(!isZoomed);
            triggerHaptic('medium');
          }
          lastTapRef.current.time = 0; 
        } else {
          lastTapRef.current.time = Date.now();
          setShowControls(prev => !prev);
        }
      }
    }
  };

  // 14. Fullscreen API
  const toggleFullscreen = async () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isCurrentlyFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement;

    if (!isCurrentlyFullscreen) {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  // 15. Streams Quality Helper
  const handleQualityChange = (stream: any) => {
    if (videoRef.current) {
      qualitySwitchTimeRef.current = videoRef.current.currentTime; 
    }
    setCurrentStreamUrl(stream.videoUrl);
    setSelectedResolution(stream.resolution);
    setTimeout(() => setSheetView('main'), 200);
  };

  // 16. Bottom Sheet Render (Strict RTL enforced)
  const renderBottomSheet = () => {
    if (!activeSheet) return null;

    return (
      <div 
        className="absolute inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={() => {
          setActiveSheet(null);
          setTimeout(() => setSheetView('main'), 300);
        }}
      >
        <div 
          className="w-full sm:w-[380px] bg-[#161821] rounded-t-3xl sm:rounded-2xl border border-white/5 shadow-2xl animate-[slideUpMobile_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative bottom-sheet"
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          {/* --- القائمة الرئيسية --- */}
          <div className={`w-full p-5 transition-transform duration-300 ease-in-out ${sheetView === 'main' ? 'translate-x-0 relative' : '-translate-x-full absolute inset-0'}`}>
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-white font-bold text-lg">الإعدادات</h3>
               <button aria-label="إغلاق الإعدادات" onClick={() => setActiveSheet(null)} className="text-white/50 hover:text-white transition-colors bg-white/5 w-8 h-8 rounded-full flex items-center justify-center outline-none focus:outline-none">
                  <i className="fa-solid fa-xmark"></i>
               </button>
            </div>

            <div className="flex justify-between items-center bg-[#1c1e2b] rounded-2xl p-4 mb-3 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/10 flex items-center justify-center text-[#E50914]">
                   <i className="fa-solid fa-shield-heart text-lg"></i>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">وضع العائلة</h4>
                  <p className="text-white/40 text-[11px] mt-0.5">تخطي تلقائي للمقاطع المخلة</p>
                </div>
              </div>
              <button 
                aria-label="تفعيل وضع العائلة"
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer outline-none focus:outline-none ${isFamilyMode ? 'bg-[#E50914]' : 'bg-white/10'}`}
                onClick={() => setIsFamilyMode(!isFamilyMode)}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isFamilyMode ? 'left-1' : 'right-1'}`}></div>
              </button>
            </div>

            <div className="bg-[#1c1e2b] rounded-2xl border border-white/5 overflow-hidden">
              <button aria-label="قائمة الترجمة" onClick={() => setSheetView('subtitles')} className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition text-white border-b border-white/5 outline-none focus:outline-none">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-closed-captioning text-white/50 w-5"></i>
                  <span className="font-bold text-sm">الترجمة</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">{selectedLanguage === 'ar' ? 'العربية' : selectedLanguage === 'en' ? 'English' : 'إيقاف'}</span>
                  <i className="fa-solid fa-chevron-left text-xs text-white/30"></i>
                </div>
              </button>
              
              <button aria-label="قائمة الجودة" onClick={() => setSheetView('quality')} className="w-full flex justify-between items-center p-4 hover:bg-white/5 transition text-white outline-none focus:outline-none">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-sliders text-white/50 w-5"></i>
                  <span className="font-bold text-sm">الجودة</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">{selectedResolution}</span>
                  <i className="fa-solid fa-chevron-left text-xs text-white/30"></i>
                </div>
              </button>
            </div>
          </div>

          {/* --- قائمة الترجمة --- */}
          <div className={`w-full p-5 transition-transform duration-300 ease-in-out ${sheetView === 'subtitles' ? 'translate-x-0 relative' : 'translate-x-full absolute inset-0'}`}>
            <div className="flex justify-between items-center mb-6">
               <button aria-label="إغلاق" onClick={() => setActiveSheet(null)} className="text-white/50 hover:text-white transition-colors bg-white/5 w-8 h-8 rounded-full flex items-center justify-center outline-none focus:outline-none">
                  <i className="fa-solid fa-xmark"></i>
               </button>
               <h3 className="text-white font-bold text-lg">الترجمة</h3>
               <button aria-label="رجوع للإعدادات" onClick={() => setSheetView('main')} className="text-white/50 hover:text-white transition-colors bg-white/5 w-8 h-8 rounded-full flex items-center justify-center outline-none focus:outline-none">
                  <i className="fa-solid fa-chevron-right"></i>
               </button>
            </div>

            <div className="mb-3">
              <span className="text-white/40 text-xs font-bold px-2">لغة الترجمة</span>
            </div>

            <div className="bg-[#1c1e2b] rounded-2xl border border-white/5 p-1.5 flex flex-col gap-1">
              <button aria-label="إيقاف الترجمة" onClick={() => { setSelectedLanguage('off'); setTimeout(() => setSheetView('main'), 200); }} className={`w-full flex items-center p-3 rounded-xl transition-colors outline-none focus:outline-none ${selectedLanguage === 'off' ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-6 flex justify-center">{selectedLanguage === 'off' && <i className="fa-solid fa-check text-[#E50914] text-sm"></i>}</div>
                <span className={`text-sm font-bold ml-auto ${selectedLanguage === 'off' ? 'text-white' : 'text-white/70'}`}>إيقاف</span>
              </button>
              <button aria-label="العربية" onClick={() => { setSelectedLanguage('ar'); setTimeout(() => setSheetView('main'), 200); }} className={`w-full flex items-center p-3 rounded-xl transition-colors outline-none focus:outline-none ${selectedLanguage === 'ar' ? 'bg-[#2a2c39]' : 'hover:bg-white/5'}`}>
                <div className="w-6 flex justify-center">{selectedLanguage === 'ar' && <i className="fa-solid fa-check text-[#E50914] text-sm"></i>}</div>
                <span className={`text-sm font-bold ml-auto ${selectedLanguage === 'ar' ? 'text-white' : 'text-white/70'}`}>العربية</span>
              </button>
              <button aria-label="English" onClick={() => { setSelectedLanguage('en'); setTimeout(() => setSheetView('main'), 200); }} className={`w-full flex items-center p-3 rounded-xl transition-colors outline-none focus:outline-none ${selectedLanguage === 'en' ? 'bg-[#2a2c39]' : 'hover:bg-white/5'}`}>
                <div className="w-6 flex justify-center">{selectedLanguage === 'en' && <i className="fa-solid fa-check text-[#E50914] text-sm"></i>}</div>
                <span className={`text-sm font-bold ml-auto ${selectedLanguage === 'en' ? 'text-white' : 'text-white/70'}`}>English</span>
              </button>
            </div>
          </div>

          {/* --- قائمة الجودة --- */}
          <div className={`w-full p-5 transition-transform duration-300 ease-in-out ${sheetView === 'quality' ? 'translate-x-0 relative' : 'translate-x-full absolute inset-0'}`}>
            <div className="flex justify-between items-center mb-6">
               <button aria-label="إغلاق" onClick={() => setActiveSheet(null)} className="text-white/50 hover:text-white transition-colors bg-white/5 w-8 h-8 rounded-full flex items-center justify-center outline-none focus:outline-none">
                  <i className="fa-solid fa-xmark"></i>
               </button>
               <h3 className="text-white font-bold text-lg">الجودة</h3>
               <button aria-label="رجوع للإعدادات" onClick={() => setSheetView('main')} className="text-white/50 hover:text-white transition-colors bg-white/5 w-8 h-8 rounded-full flex items-center justify-center outline-none focus:outline-none">
                  <i className="fa-solid fa-chevron-right"></i>
               </button>
            </div>
            
            <div className="bg-[#1c1e2b] rounded-2xl border border-white/5 p-1.5 flex flex-col gap-1 max-h-[40vh] overflow-y-auto">
              {videoData?.streams?.map((stream: any, index: number) => (
                <button 
                  key={index}
                  aria-label={`جودة ${stream.resolution}`}
                  onClick={() => handleQualityChange(stream)} 
                  className={`w-full flex items-center p-3 rounded-xl transition-colors outline-none focus:outline-none ${selectedResolution === stream.resolution ? 'bg-[#2a2c39]' : 'hover:bg-white/5'}`}
                >
                  <div className="w-6 flex justify-center">{selectedResolution === stream.resolution && <i className="fa-solid fa-check text-[#E50914] text-sm"></i>}</div>
                  <span className={`text-sm font-bold ml-auto ${selectedResolution === stream.resolution ? 'text-white' : 'text-white/70'}`}>{stream.resolution}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // --- Render ---
  return (
    <div 
      ref={playerContainerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none transition-shadow duration-700 font-sans group outline-none"
      style={{ boxShadow: `0 0 40px 10px ${ambientColor}`, paddingBottom: 'env(safe-area-inset-bottom)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        crossOrigin="anonymous"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        className={`w-full h-full ${isZoomed ? 'object-cover' : 'object-contain'} outline-none`}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onSeeking={handleWaiting}
        onSeeked={handlePlaying}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
        playsInline
      >
        {vttTracks.map((track: any) => (
          <track key={track.id} kind="subtitles" srcLang={track.type} src={track.file} label={track.name} />
        ))}
      </video>
      <canvas ref={canvasRef} width="64" height="36" className="hidden" />

      {/* Subtitles Overlay */}
      {currentSubtitle && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-30 px-4">
          <p className="text-white text-center text-lg md:text-2xl font-bold bg-black/60 px-3 py-1.5 rounded drop-shadow-md whitespace-pre-wrap" dir="auto">
            {currentSubtitle}
          </p>
        </div>
      )}

      {/* Seek Animations */}
      {showSeekAnimation === 'forward' && (
        <div className="absolute right-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="absolute right-0 w-[200%] h-[200%] bg-white/10 rounded-full animate-[ping_0.5s_ease-out_forwards] opacity-0 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col items-center">
            <i className="fa-solid fa-forward text-white/90 text-2xl drop-shadow-lg"></i>
            <span className="text-white font-bold mt-1 text-xs drop-shadow-lg">+{seekAmount} ثوانٍ</span>
          </div>
        </div>
      )}

      {showSeekAnimation === 'backward' && (
        <div className="absolute left-0 inset-y-0 w-1/3 flex flex-col items-center justify-center z-20 pointer-events-none">
          <div className="absolute left-0 w-[200%] h-[200%] bg-white/10 rounded-full animate-[ping_0.5s_ease-out_forwards] opacity-0 -translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col items-center">
            <i className="fa-solid fa-backward text-white/90 text-2xl drop-shadow-lg"></i>
            <span className="text-white font-bold mt-1 text-xs drop-shadow-lg">{seekAmount} ثوانٍ</span>
          </div>
        </div>
      )}

      {/* Center Play Button (Fixed Outline Bug) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
        <button 
          aria-label={isPaused ? "تشغيل" : "إيقافชั่วคราว"}
          onClick={togglePlay}
          style={{ width: `${smartLayout.playBtnOuter}px`, height: `${smartLayout.playBtnOuter}px`, WebkitTapHighlightColor: 'transparent' }}
          className={`flex items-center justify-center pointer-events-auto transition-transform duration-300 outline-none focus:outline-none ring-0 ${showControls || isPaused ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
        >
          <div 
            style={{ width: `${smartLayout.playBtnInner}px`, height: `${smartLayout.playBtnInner}px` }}
            className="rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white text-xl border border-white/10 shadow-lg active:scale-90 transition-all outline-none focus:outline-none ring-0"
          >
            <i className={`fa-solid ${isPaused ? 'fa-play ml-1' : 'fa-pause'}`}></i>
          </div>
        </button>
      </div>

      {/* Bottom Controls Pill (Restored Mute & Play Button, Fixed Layout) */}
      <div 
        style={{ bottom: `${smartLayout.pillMargin}px`, left: `${smartLayout.pillMargin}px`, right: `${smartLayout.pillMargin}px` }}
        className={`absolute rounded-[20px] bg-[#0f111a]/85 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-2xl transition-all duration-500 flex flex-col gap-2 z-40 ${showControls || isPaused ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-12 opacity-0'}`}
      >
        {/* Timeline (Scrubber) */}
        <div 
          className="relative w-full h-8 flex items-center group/timeline cursor-pointer touch-none scrubber-area" dir="ltr"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsScrubbing(true);
            
            if (videoRef.current) {
              wasPlayingRef.current = !videoRef.current.paused;
              videoRef.current.pause();
            }

            if (videoRef.current && isFinite(duration) && duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              videoRef.current.currentTime = percent * duration;
              if (progressBarRef.current) progressBarRef.current.style.width = `${percent * 100}%`;
              if (thumbRef.current) thumbRef.current.style.left = `${Math.min(Math.max(percent * 100, 1), 99)}%`;
              if (timeDisplayRef.current) timeDisplayRef.current.innerHTML = `${formatTime(percent * duration)} <span class="text-white/40">/</span> ${formatTime(duration)}`;
            }
          }}
          onPointerMove={(e) => {
            if (isScrubbing && videoRef.current && duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              videoRef.current.currentTime = percent * duration;
              if (progressBarRef.current) progressBarRef.current.style.width = `${percent * 100}%`;
              if (thumbRef.current) thumbRef.current.style.left = `${Math.min(Math.max(percent * 100, 1), 99)}%`;
              if (timeDisplayRef.current) timeDisplayRef.current.innerHTML = `${formatTime(percent * duration)} <span class="text-white/40">/</span> ${formatTime(duration)}`;
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsScrubbing(false);
            triggerHaptic('light');
            if (wasPlayingRef.current && videoRef.current) videoRef.current.play().catch(()=>{});
          }}
          onPointerCancel={(e) => {
            e.stopPropagation();
            e.currentTarget.releasePointerCapture(e.pointerId);
            setIsScrubbing(false);
            if (wasPlayingRef.current && videoRef.current) videoRef.current.play().catch(()=>{});
          }}
        >
          <div className="w-full h-2 bg-white/20 rounded-full relative transition-all duration-300 group-active:h-2.5">
            <div ref={progressBarRef} className="absolute left-0 top-0 bottom-0 bg-[#E50914] rounded-full" style={{ width: '0%' }}></div>
            {/* الدائرة الزرقاء تم إرجاعها بقوة (Thumb Restored) */}
            <div 
              ref={thumbRef}
              className={`absolute w-4 h-4 rounded-full bg-[#E50914] top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform shadow-[0_0_10px_rgba(229,9,20,0.6)] ${isScrubbing ? 'scale-125' : 'scale-0 group-active:scale-100'}`}
              style={{ left: `${isFinite(duration) && duration > 0 && videoRef.current ? Math.min(Math.max((videoRef.current.currentTime / duration) * 100, 1), 99) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons Row (Fixed Left/Right Organization) */}
        <div className="flex items-center justify-between mt-1">
          
          {/* Left Actions (Play, Mute, Time) */}
          <div className="flex items-center gap-4">
            <button aria-label="تشغيل / إيقاف" onClick={togglePlay} className="text-white hover:text-white/80 transition-colors pointer-events-auto outline-none focus:outline-none">
              <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'} text-lg`}></i>
            </button>
            <button aria-label="الصوت" onClick={toggleMute} className="text-white hover:text-white/80 transition-colors pointer-events-auto w-5 text-center outline-none focus:outline-none">
              <i className={`fa-solid ${isMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-lg`}></i>
            </button>
            {/* الوقت تم إرجاعه وتصليح منطق الحساب الخاص به */}
            <span ref={timeDisplayRef} aria-label="المدة" className="tabular-nums font-mono text-[12px] font-medium text-white/80 ml-1 select-none">
              00:00 <span className="text-white/40">/</span> 00:00
            </span>
          </div>

          {/* Right Actions (Settings, Fullscreen) */}
          <div className="flex items-center gap-1.5">
            <button 
              aria-label="الإعدادات"
              onClick={(e) => { e.stopPropagation(); setActiveSheet('settings'); }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all pointer-events-auto outline-none focus:outline-none ${activeSheet || isFamilyMode ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <div className="relative">
                <i className={`fa-solid fa-gear text-[14px] transition-transform ${activeSheet ? 'rotate-90' : ''}`}></i>
                {isFamilyMode && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#E50914] rounded-full animate-pulse"></div>}
              </div>
            </button>
            <button 
              aria-label="ملء الشاشة"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-9 h-9 flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white rounded-full transition-all pointer-events-auto outline-none focus:outline-none"
            >
              <i className={`fa-solid ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-sm`}></i>
            </button>
          </div>

        </div>
      </div>

      {/* Loading Spinner */}
      {isWaiting && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="w-[80px] h-[80px] bg-black/70 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/10 rounded-2xl animate-pulse">
            <i className="fa-solid fa-circle-notch fa-spin text-white text-3xl"></i>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {renderBottomSheet()}

      <style dangerouslySetInnerHTML={{__html: `@keyframes slideUpMobile { from { transform: translateY(100%); } to { transform: translateY(0); } }`}} />
    </div>
  );
}
