'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  const [activeDropdown, setActiveDropdown] = useState<'quality' | 'speed' | 'subtitles' | null>(null);

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

  // Helper to convert CDN URLs to proxy URLs
  const toProxyUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('/api/proxy') || url.startsWith('/api/stream')) return url;
    let clean = url;
    try { clean = decodeURIComponent(url); } catch { /* not encoded, use as-is */ }
    return `/api/proxy?endpoint=${encodeURIComponent(clean)}`;
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
      const preferred = streams.find(s => s.resolution === '720p' || s.resolution === '1080p') || streams[0];
      setCurrentStreamUrl(toProxyUrl(preferred.videoUrl));
      setSelectedResolution(preferred.resolution);
    } else {
      setCurrentStreamUrl(toProxyUrl(videoData.stream_url));
      setSelectedResolution('');
    }
  }, [videoData]);

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

  // Force Chromium repaint on subtitle style changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || selectedLanguage === 'off') return;
    
    const syncRepaint = () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        if (track.language === selectedLanguage && track.mode === 'showing') {
          track.mode = 'hidden';
          setTimeout(() => {
            if (track.language === selectedLanguage) {
              track.mode = 'showing';
            }
          }, 30);
        }
      }
    };
    
    syncRepaint();
  }, [showSubtitleBg, subtitleSize, selectedFont]);

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

    if (youtubeId) {
      setYoutubeFallback(true);
    } else if (retryCount < MAX_RETRIES) {
      // Retry with backoff: replace currentStreamUrl with itself to force reload
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      setTimeout(() => {
        setCurrentStreamUrl((prev) => {
          if (!prev) return prev;
          // Toggle a cache-busting param to force re-fetch
          const separator = prev.includes('?') ? '&' : '?';
          return `${prev}${separator}_retry=${nextRetry}_${Date.now()}`;
        });
      }, 2000 * nextRetry);
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

  // Load Metadata
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
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
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (container) {
      if (!document.fullscreenElement) {
        container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
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
  const getSubtitlesProxyUrl = (url: string) => `/api/proxy?endpoint=${encodeURIComponent(url)}`;

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
        <div className="absolute top-4 right-4 glass-panel px-4 py-2 rounded-xl text-xs font-bold text-yellow-400 flex items-center gap-2 border border-yellow-500/20 shadow-lg z-10 animate-pulse">
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
        className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 select-none group/player"
        dir="ltr"
      >
        {/* Dynamic Glow Overlay */}
        <div className="absolute inset-0 z-[-1] opacity-25 blur-[100px] scale-105 pointer-events-none transition-all duration-1000 bg-[#e50914]/20"></div>

        {/* Dynamic Subtitle Font Style Injection */}
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@700&family=Cairo:wght@700&family=Amiri:ital,wght@0,700;1,700&family=Outfit:wght@600&display=swap');
          
          .alex-video-cue::cue {
            font-size: ${subtitleSize}% !important;
            background: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            background-color: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            color: #ffffff !important;
            text-shadow: ${showSubtitleBg ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.95)'} !important;
            font-family: '${selectedFont}', 'Outfit', sans-serif !important;
          }
          .alex-video-cue::cue(span),
          .alex-video-cue::cue(div),
          .alex-video-cue::cue(b),
          .alex-video-cue::cue(i),
          .alex-video-cue::cue(u),
          .alex-video-cue::cue(c),
          .alex-video-cue::cue(font) {
            background: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            background-color: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            color: #ffffff !important;
            text-shadow: ${showSubtitleBg ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.95)'} !important;
            font-family: '${selectedFont}', 'Outfit', sans-serif !important;
          }
          .alex-video-cue::-webkit-media-text-track-container {
            transform: translateY(-24px) !important;
          }
          /* Generic fallback selectors */
          video::cue {
            background: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            background-color: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
          }
          video::cue(span),
          video::cue(div),
          video::cue(b),
          video::cue(i),
          video::cue(u),
          video::cue(c),
          video::cue(font) {
            background: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
            background-color: ${showSubtitleBg ? 'rgba(0, 0, 0, 0.65)' : 'transparent'} !important;
          }
        ` }} />

        {/* The Native HTML5 Video Element */}
        <video
          ref={videoRef}
          src={currentStreamUrl}
          className="w-full h-full object-contain alex-video-cue"
          onClick={() => {
            if (activeDropdown !== null) {
              setActiveDropdown(null);
            } else {
              togglePlay();
            }
          }}
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

        {/* Big Pulsing Center Play Button */}
        {isPaused && (
          <button 
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-24 md:h-24 rounded-full bg-alex-primary/95 text-white flex items-center justify-center shadow-[0_0_45px_rgba(229,9,20,0.6)] hover:scale-110 transition-all duration-300 z-20 cursor-pointer animate-fade-in-up"
          >
            <i className="fa-solid fa-play mr-1.5 text-3xl md:text-4xl"></i>
          </button>
        )}

        {/* TOP TITLE BAR */}
        <div className={`absolute top-0 inset-x-0 p-5 pt-6 pb-20 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex flex-row-reverse items-center justify-between transition-all duration-300 transform z-20 ${showControls || isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h3 className="text-white text-base md:text-lg font-black drop-shadow-md flex items-center gap-3" dir="rtl">
            <span className="w-2.5 h-2.5 rounded-full bg-alex-primary animate-pulse"></span>
            {videoData.ar_title}
          </h3>
          <span className="text-[11px] font-en font-bold px-3 py-1 bg-white/10 text-gray-300 border border-white/5 rounded-full backdrop-blur-md shadow">
            Cinemana Premium Mode
          </span>
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
        <div className={`absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-4 transition-all duration-300 transform z-30 ${showControls || isPaused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* Custom Timeline Progress Slider */}
          <div className="flex items-center gap-4 group/timeline w-full">
            <span className="text-xs font-en font-bold text-gray-300 min-w-[45px] text-left">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleProgressChange}
              style={progressStyle}
              className="flex-grow h-1.5 rounded-lg appearance-none cursor-pointer accent-alex-primary hover:h-2 transition-all outline-none"
            />
            <span className="text-xs font-en font-bold text-gray-300 min-w-[45px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Buttons */}
          <div className="flex items-center justify-between relative">
            
            {/* Left Controls */}
            <div className="flex items-center gap-4 md:gap-6">
              
              {/* Play / Pause */}
              <button 
                onClick={togglePlay} 
                className="text-white hover:text-alex-primary text-xl md:text-2xl transition-colors cursor-pointer"
              >
                <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
              </button>

              {/* Next Episode Button (Series only) */}
              {onNextEpisode && (
                <button 
                  onClick={onNextEpisode} 
                  className="text-white hover:text-alex-primary text-xl md:text-2xl transition-colors cursor-pointer"
                  title="الحلقة التالية"
                >
                  <i className="fa-solid fa-forward-step"></i>
                </button>
              )}

              {/* Volume Controller */}
              <div className="flex items-center gap-2 group/volume relative">
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="text-white hover:text-alex-primary text-lg md:text-xl transition-colors cursor-pointer"
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
                  className="w-0 group-hover/volume:w-16 md:group-hover/volume:w-20 h-1 bg-white/20 rounded accent-alex-primary transition-all duration-300 opacity-0 group-hover/volume:opacity-100 cursor-pointer"
                />
              </div>

            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4 md:gap-5">
              
              {/* Subtitles Menu */}
              {vttTranslations.length > 0 && (
                <div className="relative dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'subtitles' ? null : 'subtitles')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                      selectedLanguage !== 'off' 
                        ? 'bg-alex-primary/20 text-alex-primary border-alex-primary/30 shadow' 
                        : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <i className="fa-solid fa-closed-captioning text-sm"></i>
                    <span>الترجمة</span>
                  </button>

                  {activeDropdown === 'subtitles' && (
                    <div className="absolute bottom-full right-0 mb-3 w-48 bg-[#0a0e17]/95 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col p-2">
                      <div className="text-[10px] text-gray-400 font-bold mb-1 text-right px-1">لغة الترجمة</div>
                      <button 
                        onClick={() => { setSelectedLanguage('off'); setActiveDropdown(null); }}
                        className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedLanguage === 'off' ? 'bg-alex-primary text-white font-black' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        إيقاف
                      </button>
                      {vttTranslations.map((track) => (
                        <button 
                          key={track.id}
                          onClick={() => { setSelectedLanguage(track.type); setActiveDropdown(null); }}
                          className={`w-full text-right px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedLanguage === track.type ? 'bg-alex-primary text-white font-black' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                          {track.name === 'arabic' ? 'العربية' : 'English'}
                        </button>
                      ))}
                      
                      {/* Font Selection Section */}
                      <div className="border-t border-white/10 mt-2 pt-2 px-1 pb-1">
                        <div className="text-[10px] text-gray-400 font-bold mb-1.5 text-right px-1">نوع الخط</div>
                        <div className="flex flex-col gap-1 bg-white/5 rounded-xl p-1">
                          {[
                            { name: 'Tajawal', label: 'خط تجول' },
                            { name: 'Cairo', label: 'خط القاهرة' },
                            { name: 'Amiri', label: 'خط أميري' }
                          ].map((f) => (
                            <button
                              key={f.name}
                              onClick={(e) => { e.stopPropagation(); setSelectedFont(f.name); }}
                              className={`w-full text-right px-2 py-1 rounded-lg text-xs font-bold transition-all ${selectedFont === f.name ? 'bg-alex-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}
                              style={{ fontFamily: f.name }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Subtitle Font Size Widget */}
                      <div className="border-t border-white/10 mt-2 pt-2 px-1 pb-1">
                        <div className="text-[10px] text-gray-400 font-bold mb-1.5 text-right px-1">حجم الترجمة</div>
                        <div className="flex items-center justify-between gap-1 bg-white/5 rounded-xl p-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.max(60, prev - 10)); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-black text-xs cursor-pointer select-none"
                            title="تصغير"
                          >
                            A-
                          </button>
                          <span className="text-[10px] font-en font-bold text-gray-300 select-none min-w-[28px] text-center">{subtitleSize}%</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.min(220, prev + 10)); }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-black text-xs cursor-pointer select-none"
                            title="تكبير"
                          >
                            A+
                          </button>
                        </div>
                      </div>

                      {/* Subtitle Background Toggle Switch */}
                      <div className="border-t border-white/10 mt-2 pt-2 px-1 pb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400 font-bold text-right select-none">خلفية الترجمة</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowSubtitleBg(prev => !prev); }}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none flex items-center cursor-pointer ${
                            showSubtitleBg ? 'bg-alex-primary justify-end' : 'bg-white/10 justify-start'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white shadow-md transform will-change-transform"></span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quality Menu */}
              {streams.length > 0 && (
                <div className="relative dropdown-container">
                  <button 
                    onClick={() => setActiveDropdown(activeDropdown === 'quality' ? null : 'quality')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-xl text-xs font-black text-gray-300 transition-all"
                  >
                    <i className="fa-solid fa-sliders text-xs"></i>
                    <span>{selectedResolution || 'الجودة'}</span>
                  </button>

                  {activeDropdown === 'quality' && (
                    <div className="absolute bottom-full right-0 mb-3 w-32 bg-[#0a0e17]/95 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col p-1.5">
                      {sortedStreams.map((stream) => (
                        <button 
                          key={stream.name}
                          onClick={() => handleQualityChange(stream)}
                          className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedResolution === stream.resolution ? 'bg-alex-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                          {stream.resolution}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Speed Control Menu */}
              <div className="relative dropdown-container">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'speed' ? null : 'speed')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-xl text-xs font-black text-gray-300 transition-all font-en"
                >
                  <i className="fa-solid fa-gauge text-xs"></i>
                  <span>{playbackRate}x</span>
                </button>

                {activeDropdown === 'speed' && (
                  <div className="absolute bottom-full right-0 mb-3 w-28 bg-[#0a0e17]/95 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col p-1.5 font-en">
                    {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                      <button 
                        key={rate}
                        onClick={() => { setPlaybackRate(rate); setActiveDropdown(null); }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${playbackRate === rate ? 'bg-alex-primary text-white' : 'text-gray-300 hover:bg-white/5'}`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button 
                onClick={toggleFullscreen} 
                className="text-white hover:text-alex-primary text-lg md:text-xl transition-colors cursor-pointer"
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
      <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center mb-6 text-4xl text-gray-500 shadow-inner">
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
