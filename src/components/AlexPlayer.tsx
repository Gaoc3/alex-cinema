'use client';

import React, { useEffect, useRef, useState } from 'react';
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

interface IntroSkipping {
  start: string;
  end: string;
  control_level: string;
}

interface SkippingDurations {
  start: string[];
  end: string[];
}

interface AlexPlayerProps {
  videoData: {
    trailer?: string;
    stream_url?: string | null;
    img?: string | null;
    ar_title?: string;
    streams?: Stream[];
    translations?: Translation[];
    introSkipping?: IntroSkipping[];
    skippingDurations?: SkippingDurations | null;
    duration?: string | number | null;
    arTranslationFilePath?: string | null;
    enTranslationFilePath?: string | null;
  };
  onNextEpisode?: () => void;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function AlexPlayer({ videoData, onNextEpisode }: AlexPlayerProps) {
  const youtubeId = extractYouTubeId(videoData.trailer || '');
  const streams = videoData.streams || [];
  const translations = videoData.translations || [];

  // Stream URL & Resolution states
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<string>('');
  const [showStreamError, setShowStreamError] = useState(false);
  const [youtubeFallback, setYoutubeFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastErrorEvent, setLastErrorEvent] = useState<string | null>(null);
  const MAX_RETRIES = 3;

  // Player Control states
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(() => {
    if (videoData.duration) {
      const parsed = parseFloat(String(videoData.duration));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  });
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ar'); // Default to Arabic subtitles if available
  const [showIntroSkip, setShowIntroSkip] = useState(false);
  const [showOutroSkip, setShowOutroSkip] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Dropdown menus visibility
  const [activeDropdown, setActiveDropdown] = useState<'quality' | 'speed' | 'subtitles' | 'settings' | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Gesture State
  const [showSeekAnimation, setShowSeekAnimation] = useState<'forward' | 'backward' | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{time: number}>({time: 0});
  const touchStartRef = useRef<{x: number, y: number, time: number} | null>(null);
  const initialPinchDistance = useRef<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [videoAspect, setVideoAspect] = useState<number>(16/9);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!activeDropdown) return;
      const target = e.target as HTMLElement;
      // Close only if click is not inside a dropdown-container block
      if (target.closest('.dropdown-container')) {
        return;
      }
      setActiveDropdown(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [activeDropdown]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to proxy stream URLs — simplified since URLs are now pre-sanitized by the server
  const toProxyUrl = (url: string | undefined | null) => {
    if (!url) return null;
    const clean = url.trim();
    if (clean.startsWith('/api/proxy') || clean.startsWith('/api/stream') || clean.startsWith('/api/img')) return clean;
    return clean;
  };

  // Parse direct streams on initialization or data change
  useEffect(() => {
    setShowStreamError(false);
    setYoutubeFallback(false);
    setRetryCount(0);
    setLastErrorEvent(null);
    setIsPaused(true);
    setCurrentTime(0);

    let initialDuration = 0;
    if (videoData.duration) {
      const parsed = parseFloat(String(videoData.duration));
      if (!isNaN(parsed) && parsed > 0) {
        initialDuration = parsed;
      }
    }
    setDuration(initialDuration);

    if (streams.length > 0) {
      const preferred = streams.find(s => s.resolution && s.resolution.toLowerCase().includes('1080')) 
                     || streams.find(s => s.resolution && s.resolution.toLowerCase().includes('720')) 
                     || streams[0];
      setCurrentStreamUrl(toProxyUrl(preferred.videoUrl));
      setSelectedResolution(preferred.resolution);
    } else {
      setCurrentStreamUrl(toProxyUrl(videoData.stream_url));
      setSelectedResolution('');
    }
  }, [videoData]);

  // HLS stream logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;

    let hls: Hls | null = null;

    if (currentStreamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: true,
        });
        hls.loadSource(currentStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isPaused) {
            video.play().catch(() => {});
          }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error("HLS error:", data);
            hls?.destroy();
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentStreamUrl;
      }
    } else {
      video.src = currentStreamUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentStreamUrl]);

  // Sync volume and mute states
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate, currentStreamUrl]);

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

      // Run once immediately
      syncTracks();

      // Listen to events to re-apply the tracks
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

  // Subtitle styles are now applied via CSS Variables on the video element in globals.css

  // Control bar auto-hide logic
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    if (!isPaused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setActiveDropdown(null);
      }, 3000);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('touchstart', handleMouseMove);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('touchstart', handleMouseMove);
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPaused]);

  // Sync play/pause when user triggers manually
  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
        setIsPaused(false);
      } else {
        video.pause();
        setIsPaused(true);
      }
    }
  };

  // Gesture Handlers
  const handleSeekForward = (seconds: number = 10) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + seconds);
      setShowSeekAnimation('forward');
      setTimeout(() => setShowSeekAnimation(null), 600);
    }
  };

  const handleSeekBackward = (seconds: number = 10) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - seconds);
      setShowSeekAnimation('backward');
      setTimeout(() => setShowSeekAnimation(null), 600);
    }
  };

  const handleVideoPointerUp = (e: React.PointerEvent<HTMLVideoElement>) => {
    if (activeDropdown !== null) {
      setActiveDropdown(null);
      return;
    }

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isTouch = e.pointerType === 'touch';

    if (now - lastTapRef.current.time < 300) {
      // Double tap!
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = { time: 0 };
      
      if (clickX < rect.width * 0.35) {
        handleSeekBackward(10);
      } else if (clickX > rect.width * 0.65) {
        handleSeekForward(10);
      } else {
        toggleFullscreen();
      }
    } else {
      // Single tap
      lastTapRef.current = { time: now };
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      
      if (isTouch) {
        // Delay slightly so double tap can intercept, otherwise toggle controls UI
        tapTimeoutRef.current = setTimeout(() => {
          setShowControls(prev => !prev);
        }, 250);
      } else {
        // Desktop mouse click: Toggle play/pause instantly
        togglePlay();
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      if (initialPinchDistance.current !== null) {
        const delta = dist - initialPinchDistance.current;
        if (delta > 40 && !isZoomed) {
          setIsZoomed(true); // Pinch out to zoom
          initialPinchDistance.current = dist;
        } else if (delta < -40 && isZoomed) {
          setIsZoomed(false); // Pinch in to fit
          initialPinchDistance.current = dist;
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialPinchDistance.current = null;
    }
    
    if (touchStartRef.current && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      
      // Swipe detection removed
      touchStartRef.current = null;
    }
  };

  // Skip Intro Range Action
  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (video && videoData.introSkipping) {
      const time = video.currentTime;
      const intro = videoData.introSkipping.find(
        range => time >= parseFloat(range.start) && time < parseFloat(range.end)
      );
      if (intro) {
        video.currentTime = parseFloat(intro.end) + 0.1;
        setShowIntroSkip(false);
      }
    }
  };

  // Skip Outro Range Action (Auto-play Next Episode or Seek to end)
  const handleSkipOutro = () => {
    if (onNextEpisode) {
      onNextEpisode();
    } else {
      const video = videoRef.current;
      if (video) {
        const targetSeek = duration || video.duration;
        video.currentTime = targetSeek;
      }
    }
  };

  // Handle stream error, fallback to youtube
  const handleStreamError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const mediaError = video.error;
    const errMsg = mediaError ? `${mediaError.code}: ${mediaError.message}` : 'unknown';
    console.error("Direct stream failed to play. URL:", currentStreamUrl, "Error:", errMsg);
    setLastErrorEvent(errMsg);

    if (retryCount < MAX_RETRIES) {
      // Retry with backoff before giving up and falling back to YouTube
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      setTimeout(() => {
        setCurrentStreamUrl((prev) => {
          if (!prev) return prev;
          // Clean up old retry params to prevent infinite query string growth
          let cleanUrl = prev.replace(/(&|\?)_retry=\d+_\d+/g, '');
          const separator = cleanUrl.includes('?') ? '&' : '?';
          return `${cleanUrl}${separator}_retry=${nextRetry}_${Date.now()}`;
        });
      }, 2000 * nextRetry);
    } else if (youtubeId) {
      setYoutubeFallback(true);
    } else {
      setShowStreamError(true);
    }
  };

  // Seek time
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const newTime = parseFloat(e.target.value);
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Track time updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const time = video.currentTime;
      setCurrentTime(time);

      // 1. Check Skip Intro Ranges
      const intro = videoData.introSkipping?.find(
        range => time >= parseFloat(range.start) && time < parseFloat(range.end)
      );
      setShowIntroSkip(!!intro);

      // 2. Check Skip Outro / Next Episode timings
      if (videoData.skippingDurations && videoData.skippingDurations.start && videoData.skippingDurations.start.length > 0) {
        const lastIdx = videoData.skippingDurations.start.length - 1;
        const outroStart = parseFloat(videoData.skippingDurations.start[lastIdx]);
        if (!isNaN(outroStart)) {
          setShowOutroSkip(time >= outroStart);
        } else {
          setShowOutroSkip(false);
        }
      } else {
        setShowOutroSkip(false);
      }
    }
  };

  // Load Metadata & Adaptive Aspect Ratio
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      if (video.videoWidth && video.videoHeight) {
        setVideoAspect(video.videoWidth / video.videoHeight);
      }
      
      if (videoData.duration) {
        const parsed = parseFloat(String(videoData.duration));
        if (!isNaN(parsed) && parsed > 0) {
          setDuration(parsed);
          return;
        }
      }
      setDuration(video.duration);
    }
  };

  // Fullscreen helper
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (container) {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        try {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if ((container as any).webkitRequestFullscreen) {
            await (container as any).webkitRequestFullscreen();
          }
          setIsFullscreen(true);
          
          // Try to lock orientation to landscape on mobile
          if (screen.orientation && (screen.orientation as any).lock) {
            try {
              await (screen.orientation as any).lock('landscape');
            } catch (err) {
              console.warn('Orientation lock failed:', err);
            }
          }
        } catch (err) {
          console.error("Fullscreen failed:", err);
          setIsFullscreen(true); // CSS fallback
        }
      } else {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
          setIsFullscreen(false);
          
          // Unlock orientation
          if (screen.orientation && (screen.orientation as any).unlock) {
            (screen.orientation as any).unlock();
          }
        } catch (err) {
          console.error("Exit fullscreen failed:", err);
          setIsFullscreen(false); // CSS fallback
        }
      }
    }
  };

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const mStr = m < 10 ? `0${m}` : m;
    const sStr = s < 10 ? `0${s}` : s;

    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  // Quality Switching
  const handleQualityChange = (stream: Stream) => {
    const video = videoRef.current;
    if (video) {
      const savedTime = video.currentTime;
      const wasPlaying = !video.paused;

      setSelectedResolution(stream.resolution);
      setCurrentStreamUrl(toProxyUrl(stream.videoUrl));
      setActiveDropdown(null);

      const resumeSeek = () => {
        video.currentTime = savedTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }
        video.removeEventListener('loadedmetadata', resumeSeek);
      };
      video.addEventListener('loadedmetadata', resumeSeek);
    }
  };

  // Get Subtitle Track Files (Mapped to proxy and deduplicated)
  const getVttTracks = () => {
    const tracksMap = new Map<string, { id: string | number; name: string; type: string; file: string }>();
    
    // 1. Process translations array
    if (translations && translations.length > 0) {
      translations.forEach((t) => {
        const fileUrl = t.file;
        // Prefer native vtt over converted srt if both exist in API response
        const isVtt = t.extention === 'vtt' || fileUrl.includes('.vtt');
        const existing = tracksMap.get(t.type);
        if (!existing || isVtt) {
          tracksMap.set(t.type, {
            id: t.id,
            name: t.name,
            type: t.type, // 'ar' or 'en'
            file: fileUrl
          });
        }
      });
    }

    // 2. Fallback to individual file paths
    if (tracksMap.size === 0) {
      if (videoData.arTranslationFilePath) {
        tracksMap.set('ar', {
          id: 'fallback-ar',
          name: 'arabic',
          type: 'ar',
          file: videoData.arTranslationFilePath
        });
      }
      if (videoData.enTranslationFilePath) {
        tracksMap.set('en', {
          id: 'fallback-en',
          name: 'english',
          type: 'en',
          file: videoData.enTranslationFilePath
        });
      }
    }
    return Array.from(tracksMap.values());
  };

  const vttTranslations = getVttTracks();
  const getSubtitlesProxyUrl = (url: string) => url;

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const video = videoRef.current;
      if (!video || youtubeFallback) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          setIsMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [youtubeFallback, volume, isMuted]);

  // Sync fullscreen state change (e.g. Esc button pressed)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const sortedStreams = [...streams].sort((a, b) => {
    const resA = parseInt(a.resolution) || 0;
    const resB = parseInt(b.resolution) || 0;
    return resB - resA; // Descending order: highest quality first!
  });

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #e50914 ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%)`
  };

  // Render Helpers for Dropdown Menus (Mobile Portal vs Desktop Absolute)
  const renderSubtitlesMenu = () => (
    <div 
      className="relative w-full max-w-[340px] md:w-72 max-h-[85vh] md:max-h-[60vh] overflow-y-auto liquid-glass-heavy md:bg-[#141414]/95 border border-white/10 rounded-3xl md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] md:shadow-2xl flex flex-col p-4 animate-fade-in-up"
      onPointerUp={(e) => e.stopPropagation()}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
         <div className="text-base md:text-sm text-white font-black">إعدادات الترجمة</div>
         <button onClick={() => setActiveDropdown(null)} className="w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"><i className="fa-solid fa-xmark md:text-xs"></i></button>
      </div>
      
      <div className="text-sm md:text-xs text-gray-400 font-bold mb-2">لغة الترجمة</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button 
          onClick={() => { setSelectedLanguage('off'); setActiveDropdown(null); }}
          className={`px-3 py-3 md:py-2 rounded-xl md:rounded-lg text-xs font-bold transition-all ${selectedLanguage === 'off' ? 'bg-alex-primary text-white font-black shadow-lg' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
        >
          إيقاف
        </button>
        {vttTranslations.map((track) => (
          <button 
            key={track.id}
            onClick={() => { setSelectedLanguage(track.type); setActiveDropdown(null); }}
            className={`px-3 py-3 md:py-2 rounded-xl md:rounded-lg text-xs font-bold transition-all ${selectedLanguage === track.type ? 'bg-alex-primary text-white font-black shadow-lg' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
          >
            {track.name === 'arabic' ? 'العربية' : 'English'}
          </button>
        ))}
      </div>
      
      <div className="text-sm md:text-xs text-gray-400 font-bold mb-2">نوع الخط</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { name: 'Tajawal', label: 'تجول' },
          { name: 'Cairo', label: 'القاهرة' },
          { name: 'Amiri', label: 'أميري' }
        ].map((f) => (
          <button
            key={f.name}
            onClick={(e) => { e.stopPropagation(); setSelectedFont(f.name); }}
            className={`px-2 py-3 md:py-2 rounded-xl md:rounded-lg text-xs font-bold transition-all ${selectedFont === f.name ? 'bg-white text-black' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
            style={{ fontFamily: f.name }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-sm md:text-xs text-gray-400 font-bold mb-2">حجم الخط</div>
      <div className="flex items-center justify-between gap-4 bg-white/5 rounded-2xl md:rounded-xl p-2 mb-4">
        <button 
          onClick={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.min(220, prev + 10)); }}
          className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-colors"
        >
          A+
        </button>
        <span className="text-sm font-en font-bold text-white min-w-[40px] text-center">{subtitleSize}%</span>
        <button 
          onClick={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.max(60, prev - 10)); }}
          className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-colors"
        >
          A-
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
        <span className="text-sm md:text-xs text-gray-300 font-bold">خلفية سوداء للترجمة</span>
        <button
          onClick={(e) => { e.stopPropagation(); setShowSubtitleBg(prev => !prev); }}
          className={`w-14 h-7 md:w-12 md:h-6 rounded-full p-1 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
            showSubtitleBg ? 'bg-alex-primary justify-end' : 'bg-white/20 justify-start'
          }`}
        >
          <span className="w-5 h-5 md:w-4 md:h-4 rounded-full bg-white shadow-md transform will-change-transform"></span>
        </button>
      </div>
    </div>
  );

  const renderQualityMenu = () => (
    <div 
      className="relative w-full max-w-[280px] md:w-56 max-h-[80vh] md:max-h-[60vh] overflow-y-auto liquid-glass-heavy md:bg-[#141414]/95 border border-white/10 rounded-3xl md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] md:shadow-2xl flex flex-col p-4 md:p-3 animate-fade-in-up"
      onPointerUp={(e) => e.stopPropagation()}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
         <div className="text-base md:text-sm text-white font-black">جودة العرض</div>
         <button onClick={() => setActiveDropdown(null)} className="w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"><i className="fa-solid fa-xmark md:text-xs"></i></button>
      </div>
      {sortedStreams.map((stream) => (
        <button 
          key={stream.name}
          onClick={() => { handleQualityChange(stream); setActiveDropdown(null); }}
          className={`w-full text-center px-4 py-3.5 md:py-2.5 mb-2 md:mb-1.5 rounded-xl md:rounded-lg text-sm md:text-xs font-bold transition-all ${selectedResolution === stream.resolution ? 'bg-alex-primary text-white shadow-lg' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
        >
          {stream.resolution}
        </button>
      ))}
    </div>
  );

  const renderSpeedMenu = () => (
    <div 
      className="relative w-full max-w-[280px] md:w-56 max-h-[80vh] md:max-h-[60vh] overflow-y-auto liquid-glass-heavy md:bg-[#141414]/95 border border-white/10 rounded-3xl md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] md:shadow-2xl flex flex-col p-4 md:p-3 animate-fade-in-up font-en"
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 font-ar" dir="rtl">
         <div className="text-base md:text-sm text-white font-black">سرعة التشغيل</div>
         <button onClick={() => setActiveDropdown(null)} className="w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"><i className="fa-solid fa-xmark md:text-xs"></i></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
          <button 
            key={rate}
            onClick={() => { setPlaybackRate(rate); setActiveDropdown(null); }}
            className={`w-full text-center px-4 py-3.5 md:py-2.5 rounded-xl md:rounded-lg text-sm md:text-xs font-bold transition-all ${playbackRate === rate ? 'bg-alex-primary text-white shadow-lg' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
          >
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );

  // YouTube Fallback Player Render
  if (youtubeFallback && youtubeId) {
    return (
      <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/5 bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&color=red`}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={videoData.ar_title || 'Video Player'}
        ></iframe>
        <div className="absolute top-4 right-4 ios-glass px-4 py-2 rounded-xl text-xs font-bold text-yellow-400 flex items-center gap-2 border border-yellow-500/20 shadow-lg z-10 animate-pulse">
          <i className="fa-solid fa-triangle-exclamation"></i>
          يتم تشغيل التريلر الترويجي (فشل جلب البث المباشر)
        </div>
      </div>
    );
  }

  // HTML5 Cinema Player with Custom UI Controls
  if (currentStreamUrl && !showStreamError) {
    return (
      <div 
        ref={containerRef}
        className={`relative select-none group/player touch-manipulation transition-all duration-300 min-h-[200px] ${
          isFullscreen 
            ? 'fixed inset-0 w-screen h-screen z-[9999] rounded-none border-none bg-black' 
            : 'w-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 bg-black/90'
        }`}
        style={{ aspectRatio: isFullscreen ? 'auto' : videoAspect }}
        dir="ltr"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Inner wrapper for rounded corners and overflow clipping to not affect dropdowns */}
        <div className={`absolute inset-0 w-full h-full pointer-events-none ${isFullscreen ? 'rounded-none' : 'rounded-3xl overflow-hidden'}`}>
          {/* Dynamic Glow Overlay */}
          <div className="absolute inset-0 z-[-1] opacity-25 blur-[100px] scale-105 transition-all duration-1000 bg-[#e50914]/20"></div>
        </div>

        {/* Double Tap Seek Animations */}
        {showSeekAnimation === 'forward' && (
          <div className="absolute inset-y-0 right-0 w-1/3 ios-active flex flex-col items-center justify-center rounded-l-[100%] animate-pulse z-30 pointer-events-none transition-all">
            <div className="flex gap-1 text-white text-3xl md:text-5xl drop-shadow-lg">
              <i className="fa-solid fa-forward"></i>
            </div>
            <span className="text-white font-black mt-2 text-sm md:text-base drop-shadow-md">+10 ثوانٍ</span>
          </div>
        )}
        {showSeekAnimation === 'backward' && (
          <div className="absolute inset-y-0 left-0 w-1/3 ios-active flex flex-col items-center justify-center rounded-r-[100%] animate-pulse z-30 pointer-events-none transition-all">
            <div className="flex gap-1 text-white text-3xl md:text-5xl drop-shadow-lg">
              <i className="fa-solid fa-backward"></i>
            </div>
            <span className="text-white font-black mt-2 text-sm md:text-base drop-shadow-md">-10 ثوانٍ</span>
          </div>
        )}

        {/* The Native HTML5 Video Element */}
        <div className={`absolute inset-0 w-full h-full ${isFullscreen ? 'rounded-none' : 'rounded-3xl overflow-hidden'}`}>
          <video
            ref={videoRef}
            className={`w-full h-full alex-video-cue cursor-pointer transition-all duration-300 ${isZoomed ? 'object-cover' : 'object-contain'}`}
            style={{
              '--sub-size': `${subtitleSize}%`,
              '--sub-bg': showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent',
              '--sub-shadow': showSubtitleBg ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.95)',
              '--sub-font': `'${selectedFont}', 'Outfit', sans-serif`,
              '--sub-offset-y': isZoomed || isFullscreen ? (showControls ? '-10vh' : '-24px') : (showControls ? '-60px' : '-24px')
            } as React.CSSProperties}
            onPointerUp={handleVideoPointerUp}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleStreamError}
            crossOrigin="anonymous"
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
            autoPlay
            playsInline
          >
            {vttTranslations.map((track) => (
              <track
                key={track.id}
                kind="subtitles"
                src={getSubtitlesProxyUrl(track.file)}
                srcLang={track.type}
                label={track.name === 'arabic' ? 'العربية' : 'English'}
                default={track.type === 'ar'}
              />
            ))}
          </video>
        </div>

        {/* Big Pulsing Center Play Button */}
        {isPaused && (
          <button 
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 md:w-24 md:h-24 rounded-full bg-alex-primary/95 text-white flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.6)] md:shadow-[0_0_45px_rgba(229,9,20,0.6)] hover:scale-110 transition-all duration-300 z-20 cursor-pointer animate-fade-in-up"
          >
            <i className="fa-solid fa-play ml-1 md:mr-1.5 text-2xl md:text-4xl"></i>
          </button>
        )}

        {/* TOP TITLE BAR */}
        <div className={`absolute top-0 inset-x-0 p-3 pb-8 md:p-5 md:pt-6 md:pb-20 bg-gradient-to-b from-black/90 md:via-black/40 to-transparent flex flex-row-reverse items-center justify-between transition-all duration-300 transform z-20 ${showControls || isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h3 className="text-white text-xs md:text-lg font-black drop-shadow-md flex items-center gap-2 md:gap-3" dir="rtl">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-alex-primary animate-pulse"></span>
            {videoData.ar_title}
          </h3>
        </div>

        {/* OVERLAY ACTIONS (Skip Intro / Skip Outro) */}
        {showIntroSkip && (
          <button
            onClick={handleSkipIntro}
            className="absolute bottom-24 right-6 flex items-center justify-center gap-2.5 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white font-black text-sm md:text-base px-5 py-2.5 rounded-xl border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-40 transition-all duration-300 cursor-pointer leading-none"
          >
            <i className="fa-solid fa-forward-step text-xs text-gray-300 leading-none"></i>
            <span className="leading-none">تخطي المقدمة</span>
          </button>
        )}

        {showOutroSkip && (
          <button
            onClick={handleSkipOutro}
            className="absolute bottom-24 right-6 flex items-center justify-center gap-2.5 bg-black/60 backdrop-blur-md hover:bg-black/80 text-white font-black text-sm md:text-base px-5 py-2.5 rounded-xl border border-white/20 hover:border-white/40 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-40 transition-all duration-300 cursor-pointer leading-none"
          >
            <i className="fa-solid fa-forward text-xs text-gray-300 leading-none"></i>
            <span className="leading-none">{onNextEpisode ? 'الحلقة التالية' : 'تخطي النهاية'}</span>
          </button>
        )}

        {/* BOTTOM CUSTOM CONTROL BAR */}
        <div className={`absolute bottom-0 inset-x-0 p-2 pt-6 pb-[calc(env(safe-area-inset-bottom)+4px)] sm:px-6 md:pb-8 md:pt-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-1.5 md:gap-3 transition-all duration-300 transform z-30 ${showControls || isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Custom Timeline Progress Slider */}
          <div className="flex items-center gap-2 md:gap-4 w-full">
            <span className="text-[10px] md:text-xs font-en font-bold text-gray-300 min-w-[32px] md:min-w-[45px] text-left">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleProgressChange}
              style={progressStyle}
              className="flex-grow h-1 md:h-1.5 rounded-lg appearance-none cursor-pointer accent-alex-primary hover:h-1.5 md:hover:h-2 transition-all outline-none"
            />
            <span className="text-[10px] md:text-xs font-en font-bold text-gray-300 min-w-[32px] md:min-w-[45px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Buttons */}
          <div className="flex items-center justify-between relative">
            
            {/* Left Controls */}
            <div className="flex items-center gap-1.5 md:gap-6">
              
              {/* Play / Pause */}
              <button 
                onClick={togglePlay} 
                className="text-white hover:text-alex-primary text-lg md:text-2xl transition-colors cursor-pointer w-8 h-8 md:w-6 md:h-6 flex items-center justify-center"
              >
                <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
              </button>

              {/* Next Episode Button (Series only) */}
              {onNextEpisode && (
                <button 
                  onClick={onNextEpisode} 
                  className="text-white hover:text-alex-primary text-lg md:text-2xl transition-colors cursor-pointer w-8 h-8 md:w-6 md:h-6 flex items-center justify-center"
                  title="الحلقة التالية"
                >
                  <i className="fa-solid fa-forward-step"></i>
                </button>
              )}

              {/* Volume Controller */}
              <div className="hidden md:flex items-center gap-2 group/volume relative">
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="text-white hover:text-alex-primary text-base md:text-xl transition-colors cursor-pointer w-6 h-6 flex items-center justify-center"
                >
                  <i className={`fa-solid ${isMuted || volume === 0 ? 'fa-volume-xmark' : volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high'}`}></i>
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-0 group-hover/volume:w-20 h-1 bg-white/20 rounded accent-alex-primary transition-all duration-300 opacity-0 group-hover/volume:opacity-100 cursor-pointer"
                />
              </div>

            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-1 md:gap-4 flex-nowrap">
              
              {/* Subtitles Menu */}
              {vttTranslations.length > 0 && (
                <div className="static md:relative dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'subtitles' ? null : 'subtitles')}
                    className={`flex items-center justify-center gap-1.5 h-8 md:h-10 px-2 md:px-3 rounded-lg md:rounded-xl border text-[10px] md:text-xs font-black transition-all min-w-[32px] md:min-w-[40px] ${
                      selectedLanguage !== 'off' 
                        ? 'bg-alex-primary/20 text-alex-primary border-alex-primary/30 shadow' 
                        : 'ios-button text-gray-300 border-white/5 hover:ios-active'
                    }`}
                  >
                    <i className="fa-solid fa-closed-captioning text-sm md:text-base"></i>
                    <span className="hidden md:inline">الترجمة</span>
                  </button>

                  {activeDropdown === 'subtitles' && (
                    <>
                      {typeof document !== 'undefined' && createPortal(
                        <div className="md:hidden fixed inset-0 z-[999999] flex items-center justify-center p-4">
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setActiveDropdown(null)}></div>
                          {renderSubtitlesMenu()}
                        </div>,
                        document.body
                      )}
                      <div className="hidden md:flex absolute bottom-full right-0 mb-4 z-50">
                        {renderSubtitlesMenu()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Quality Menu */}
              {streams.length > 0 && (
                <div className="static md:relative dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'quality' ? null : 'quality')}
                    className="flex items-center justify-center gap-1.5 h-8 md:h-10 px-2 md:px-3 ios-button border border-white/5 hover:ios-active hover:border-white/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-gray-300 transition-all min-w-[32px] md:min-w-[40px]"
                  >
                    <i className="fa-solid fa-sliders text-sm md:text-xs"></i>
                    <span className="hidden md:inline">{selectedResolution || 'الجودة'}</span>
                  </button>

                  {activeDropdown === 'quality' && (
                    <>
                      {typeof document !== 'undefined' && createPortal(
                        <div className="md:hidden fixed inset-0 z-[999999] flex items-center justify-center p-4">
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setActiveDropdown(null)}></div>
                          {renderQualityMenu()}
                        </div>,
                        document.body
                      )}
                      <div className="hidden md:flex absolute bottom-full right-0 mb-4 z-50">
                        {renderQualityMenu()}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Speed Control Menu */}
              <div className="static md:relative dropdown-container">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'speed' ? null : 'speed')}
                  className="flex items-center justify-center gap-1 h-8 md:h-10 px-2 md:px-3 ios-button border border-white/5 hover:ios-active hover:border-white/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-gray-300 transition-all font-en min-w-[32px] md:min-w-[40px]"
                >
                  <i className="fa-solid fa-gauge text-sm md:text-xs"></i>
                  <span className="hidden md:inline">{playbackRate}x</span>
                </button>

                {activeDropdown === 'speed' && (
                  <>
                    {typeof document !== 'undefined' && createPortal(
                      <div className="md:hidden fixed inset-0 z-[999999] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setActiveDropdown(null)}></div>
                        {renderSpeedMenu()}
                      </div>,
                      document.body
                    )}
                    <div className="hidden md:flex absolute bottom-full right-0 mb-4 z-50">
                      {renderSpeedMenu()}
                    </div>
                  </>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button 
                onClick={toggleFullscreen} 
                className="text-white hover:text-alex-primary text-lg md:text-2xl transition-colors cursor-pointer w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-minimize' : 'fa-maximize'}`}></i>
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // Fallback UI (e.g. No stream and no trailer)
  return (
    <div className="aspect-video flex flex-col items-center justify-center bg-alex-card rounded-3xl border border-white/5">
      <div className="w-24 h-24 rounded-full ios-glass flex items-center justify-center mb-6 text-4xl text-gray-500 shadow-inner">
        <i className="fa-solid fa-video-slash"></i>
      </div>
      <h2 className="text-2xl text-white font-black mb-2">البث غير متوفر حالياً</h2>
      <p className="text-gray-400 font-medium">عذراً، لم نتمكن من العثور على مسار البث المباشر لهذا المحتوى.</p>
      {currentStreamUrl && showStreamError && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-xs text-gray-500 font-mono max-w-md text-center">{lastErrorEvent}</p>
          <button
            onClick={() => {
              setShowStreamError(false);
              setRetryCount(0);
              setCurrentStreamUrl((prev) => {
                if (!prev) return prev;
                const sep = prev.includes('?') ? '&' : '?';
                return `${prev}${sep}_manual_retry=${Date.now()}`;
              });
            }}
            className="px-6 py-2 bg-alex-primary text-white rounded-xl font-bold text-sm hover:bg-alex-primary/80 transition-colors cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}
