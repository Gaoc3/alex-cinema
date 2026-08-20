'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import type { WatchRoomHook } from '@/hooks/useWatchRoom';
import {
  findActiveIntroOrOutro,
  findActiveParentalSkip,
  isParentSkippingEnabled,
} from './playerSkipRanges';
import type {
  IntroSkipRange,
  ParentalSkippingDurations,
  ParentSkippingFlag,
  SkipSegmentKind,
} from './playerSkipRanges';
import { usePlayerZoom } from '@/hooks/usePlayerZoom';

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

type TextCueWithContent = TextTrackCue & { text?: string };
type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

/**
 * Strip formatting artifacts from subtitle cue text:
 * 1. ASS/SSA override tags: {\an8}, {\pos(...)}, etc.
 * 2. HTML tags: <i>, <b>, <font color="...">, etc.
 * 3. Leading/trailing whitespace per line.
 */
const cleanSubtitleText = (text: string): string => {
  return text
    // Remove ASS/SSA override blocks: {...}
    .replace(/\{[^}]*\}/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#?\w+;/g, '')
    // Trim each line
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .trim();
};

const getCueText = (cue: TextTrackCue) => cleanSubtitleText((cue as TextCueWithContent).text || '');

interface AlexPlayerProps {
  videoData: {
    trailer?: string;
    stream_url?: string | null;
    img?: string | null;
    ar_title?: string;
    streams?: Stream[];
    translations?: Translation[];
    introSkipping?: IntroSkipRange[];
    skippingDurations?: ParentalSkippingDurations | null;
    parent_skipping?: ParentSkippingFlag;
    duration?: string | number | null;
    arTranslationFilePath?: string | null;
    enTranslationFilePath?: string | null;
  };
  onNextEpisode?: () => void;
  roomHook?: WatchRoomHook;
}

const EMPTY_STREAMS: Stream[] = [];

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function AlexPlayer({ videoData, onNextEpisode, roomHook }: AlexPlayerProps) {
  const youtubeId = extractYouTubeId(videoData.trailer || '');
  const streams = videoData.streams || EMPTY_STREAMS;
  const translations = videoData.translations || [];

  const isHost = roomHook?.isHost;
  const roomState = roomHook?.roomState;
  const sendSyncUpdate = roomHook?.sendSyncUpdate;

  // Stream URL & Resolution states with persistent session memory
  const [useTunnelFallback, setUseTunnelFallbackState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('alex_use_tunnel') === 'true';
    }
    return false;
  });

  const setUseTunnelFallback = (val: boolean) => {
    if (typeof window !== 'undefined' && val) {
      sessionStorage.setItem('alex_use_tunnel', 'true');
    }
    setUseTunnelFallbackState(val);
  };

  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(() => {
    if (streams && streams.length > 0) {
      const preferred = streams.find(s => s.resolution && s.resolution.toLowerCase().includes('1080')) 
                     || streams.find(s => s.resolution && s.resolution.toLowerCase().includes('720')) 
                     || streams[0];
      const target = (preferred.videoUrl || (preferred as { stream_url?: string }).stream_url || (preferred as { directUrl?: string }).directUrl) as string;
      return target ? target.trim() : null;
    }
    const target = (videoData.stream_url || (videoData as { direct_stream_url?: string }).direct_stream_url) as string;
    return target ? target.trim() : null;
  });
  const [selectedResolution, setSelectedResolution] = useState<string>(() => {
    if (streams && streams.length > 0) {
      const preferred = streams.find(s => s.resolution && s.resolution.toLowerCase().includes('1080')) 
                     || streams.find(s => s.resolution && s.resolution.toLowerCase().includes('720')) 
                     || streams[0];
      return preferred.resolution || '';
    }
    return '';
  });
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
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
  const [activeSkipKind, setActiveSkipKind] = useState<SkipSegmentKind | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Family Mode State (Explicit scene skip)
  const [isFamilyMode, setIsFamilyMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('alex_family_mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('alex_family_mode', String(isFamilyMode));
  }, [isFamilyMode]);

  // Loading spinner state (with 1s delayed resolution)
  const [isWaiting, setIsWaiting] = useState(false);
  const waitingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (streamRetryTimeoutRef.current) {
      clearTimeout(streamRetryTimeoutRef.current);
      streamRetryTimeoutRef.current = null;
    }
  }, [currentStreamUrl]);
  
  // Dropdown menus visibility
  const [activeDropdown, setActiveDropdown] = useState<'quality' | 'speed' | 'subtitles' | 'settings' | null>(null);
  const [settingsView, setSettingsView] = useState<'main' | 'subtitles' | 'quality' | 'speed'>('main');

  useEffect(() => {
    if (activeDropdown === 'settings') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSettingsView('main');
    });
    return () => { cancelled = true; };
  }, [activeDropdown]);

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
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

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

  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsBarRef = useRef<HTMLDivElement>(null);
  const [controlsBarHeight, setControlsBarHeight] = useState(0);
  const qualityRestoreRef = useRef<(() => void) | null>(null);
  const {
    isZoomed,
    showZoomIndicator,
    shouldSuppressTap,
    toggleZoom,
    videoZoomStyle,
    zoomPercent,
  } = usePlayerZoom({
    containerRef,
    videoRef,
    isFullscreen,
    resetKey: `${videoData.stream_url || ''}:${videoData.ar_title || ''}`,
    surfaceKey: currentStreamUrl,
    onPinchStart: () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      setActiveDropdown(null);
      setShowControls(true);
    },
    onPinchEnd: () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (!videoRef.current?.paused) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
          setActiveDropdown(null);
        }, 3000);
      }
    },
  });
  const lastSyncTimeRef = useRef(0);
  const shouldResumePlaybackRef = useRef(!isPaused);

  useEffect(() => {
    shouldResumePlaybackRef.current = !isPaused;
  }, [isPaused]);

  // Keep a guest synchronized with the host after all media refs exist.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !roomState || isHost || !roomHook) return;

    const elapsed = roomState.playing
      ? Math.max(0, (Date.now() - (roomState.receivedAt || Date.now())) / 1000)
      : 0;
    const targetTime = Math.max(0, roomState.time + elapsed);
    if (Math.abs(video.currentTime - targetTime) > 2) {
      video.currentTime = targetTime;
    }

    if (roomState.playing && video.paused) {
      video.play().catch(error => console.log('Autoplay prevented', error));
    } else if (!roomState.playing && !video.paused) {
      video.pause();
    }
  }, [roomState, isHost, roomHook]);

  // Pixel-level adaptation (Ambient Light Glow)
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || youtubeFallback) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let isDrawing = false;

    const updateAmbient = () => {
      if (video.paused || video.ended) {
        isDrawing = false;
        return;
      }
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch {
          // Ignore cross-origin canvas errors if they happen
        }
      }
      animationFrameId = requestAnimationFrame(updateAmbient);
    };

    const startDrawing = () => {
      if (!isDrawing) {
        isDrawing = true;
        updateAmbient();
      }
    };

    const drawOnce = () => {
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } catch {}
      }
    };

    video.addEventListener('play', startDrawing);
    video.addEventListener('seeked', drawOnce);
    video.addEventListener('loadeddata', drawOnce);

    return () => {
      video.removeEventListener('play', startDrawing);
      video.removeEventListener('seeked', drawOnce);
      video.removeEventListener('loadeddata', drawOnce);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [currentStreamUrl, youtubeFallback]);

  // Helper to proxy stream URLs — route through universal tunnel proxy
  const toProxyUrl = (url: string | undefined | null) => {
    if (!url) return null;
    const clean = url.trim();
    if (clean.startsWith('/tunnel/') || clean.startsWith('/api/')) return clean;
    const match = clean.match(/^https?:\/\/([a-zA-Z0-9_-]+)\.shabakaty\.com\/(.*)$/i);
    if (match) {
      return `/tunnel/${match[1]}/${match[2]}`;
    }
    return clean;
  };

  // Helper to resolve effective stream URL based on network status (Always prioritize universal VPS Tunnel Proxy)
  const getStreamTargetUrl = (streamOrData: any, _tunnelFallback?: boolean) => {
    if (!streamOrData) return null;
    const proxied = streamOrData.videoUrl || streamOrData.stream_url;
    if (proxied && (proxied.startsWith('/api/') || proxied.includes('/api/tunnel-video'))) {
      return proxied;
    }
    return (streamOrData.videoUrl || streamOrData.stream_url || streamOrData.directUrl || streamOrData.direct_stream_url || null) as string | null;
  };

  // Parse direct or proxied streams on initialization, data change, or tunnel fallback state change
  const currentVideoIdRef = useRef<string | null>(null);
  useEffect(() => {
    const videoId = (videoData as any)?.nb || (videoData as any)?.id || videoData?.ar_title || '';
    const isNewVideo = currentVideoIdRef.current !== videoId;

    if (currentStreamUrl && selectedResolution && !isNewVideo) {
      return;
    }

    currentVideoIdRef.current = videoId;
    let initialStreamUrl: string | null = null;
    let initialResolution: string = '';
    if (streams.length > 0) {
      const preferred = streams.find(s => s.resolution && s.resolution.toLowerCase().includes('1080')) 
                     || streams.find(s => s.resolution && s.resolution.toLowerCase().includes('720')) 
                     || streams[0];
      const target = getStreamTargetUrl(preferred, useTunnelFallback);
      initialStreamUrl = toProxyUrl(target);
      initialResolution = preferred.resolution;
    } else {
      const target = getStreamTargetUrl(videoData, useTunnelFallback);
      initialStreamUrl = toProxyUrl(target);
      initialResolution = '';
    }

    if (initialStreamUrl) {
      setCurrentStreamUrl(initialStreamUrl);
      setSelectedResolution(initialResolution);
    }
  }, [(videoData as any)?.nb, (videoData as any)?.id, videoData?.ar_title, streams, useTunnelFallback]);

  // HLS stream logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;

    let hls: Hls | null = null;

    const isHlsStream = currentStreamUrl.includes('.m3u8') || currentStreamUrl.startsWith('/api/hls?');
    let fatalRecoveryAttempts = 0;

    if (isHlsStream) {
      if (Hls.isSupported()) {
        hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: true,
          // Make HLS much more tolerant of slow VPS speeds
          fragLoadingTimeOut: 30000,
          manifestLoadingTimeOut: 30000,
          levelLoadingTimeOut: 30000,
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 2000,
          manifestLoadingRetryDelay: 2000,
          levelLoadingRetryDelay: 2000,
        });
        hls.loadSource(currentStreamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (shouldResumePlaybackRef.current) {
            video.play().catch(() => {});
          }
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error("HLS error:", data);
            if (!useTunnelFallback && currentStreamUrl && (currentStreamUrl.startsWith('http://') || currentStreamUrl.startsWith('https://'))) {
              console.warn("[SmartStream] HLS fatal error on direct stream. Switching to VPS Tunnel Proxy...");
              setUseTunnelFallback(true);
              return;
            }
            fatalRecoveryAttempts += 1;
            if (fatalRecoveryAttempts > 2) {
              hls?.destroy();
              if (youtubeId) setYoutubeFallback(true);
              else setShowStreamError(true);
              return;
            }
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("Network error encountered, trying to recover...");
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("Media error encountered, trying to recover...");
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                break;
            }
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
  }, [currentStreamUrl, youtubeId, useTunnelFallback]);

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
      const effectiveRate = roomHook ? 1 : playbackRate;
      video.playbackRate = effectiveRate;
      if (roomHook && playbackRate !== 1) queueMicrotask(() => setPlaybackRate(1));
    }
  }, [playbackRate, currentStreamUrl, roomHook]);

  // Sync Text Tracks (Subtitles) — Single source of truth
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
          track.mode = 'hidden'; // 'hidden' guarantees native cues aren't rendered, but activeCues is populated
          // Extract cue text
          if (track.activeCues && track.activeCues.length > 0) {
            newActiveText = Array.from(track.activeCues)
              .map(getCueText).join('\n');
          } else if (track.cues && track.cues.length > 0) {
            const ct = video.currentTime;
            newActiveText = Array.from(track.cues)
              .filter(cue => ct >= cue.startTime && ct <= cue.endTime)
              .map(getCueText).join('\n');
          }
        } else {
          track.mode = 'disabled';
        }
      }
      setCurrentSubtitle(newActiveText);
    };

    // Run once immediately
    syncTracks();

    // Listen for individual track cue changes (real-time subtitle updates)
    const onCueChange = () => syncTracks();
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].addEventListener('cuechange', onCueChange);
    }
    
    // Listen to events to re-apply the tracks
    video.addEventListener('play', syncTracks);
    video.addEventListener('loadedmetadata', syncTracks);
    video.addEventListener('loadeddata', syncTracks);
    video.textTracks.addEventListener('change', syncTracks);
    video.textTracks.addEventListener('addtrack', () => {
      // New track added — re-attach cuechange and sync
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener('cuechange', onCueChange);
        video.textTracks[i].addEventListener('cuechange', onCueChange);
      }
      syncTracks();
    });

    return () => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener('cuechange', onCueChange);
      }
      video.removeEventListener('play', syncTracks);
      video.removeEventListener('loadedmetadata', syncTracks);
      video.removeEventListener('loadeddata', syncTracks);
      video.textTracks.removeEventListener('change', syncTracks);
    };
  }, [selectedLanguage, currentStreamUrl]);

  // Subtitle styles are now applied via CSS Variables on the video element in globals.css

  // Control bar auto-hide logic
  useEffect(() => {
    const container = containerRef.current;
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
      if (roomHook && !isHost) {
        if (roomState?.playing) {
          const elapsed = Math.max(0, (Date.now() - (roomState.receivedAt || Date.now())) / 1000);
          video.currentTime = Math.max(0, roomState.time + elapsed);
          video.play().catch(() => setIsPaused(true));
        } else {
          video.pause();
        }
        return;
      }
      if (video.paused || video.ended) {
        video.play().catch(() => setIsPaused(true));
      } else {
        video.pause();
      }
    }
  };

  // Gesture Handlers
  const handleSeekForward = (seconds: number = 10) => {
    if (roomHook && !isHost) return;
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.min(video.duration || 0, video.currentTime + seconds);
      setShowSeekAnimation('forward');
      setTimeout(() => setShowSeekAnimation(null), 600);
    }
  };

  const handleSeekBackward = (seconds: number = 10) => {
    if (roomHook && !isHost) return;
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, video.currentTime - seconds);
      setShowSeekAnimation('backward');
      setTimeout(() => setShowSeekAnimation(null), 600);
    }
  };

  const handleVideoPointerUp = (e: React.PointerEvent<HTMLVideoElement>) => {
    if (shouldSuppressTap()) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      return;
    }

    if (activeDropdown !== null) {
      setActiveDropdown(null);
      return;
    }

    const now = e.timeStamp;
    const rect = containerRef.current?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isTouch = e.pointerType === 'touch';
    const lastTap = lastTapRef.current;
    const isNearbyTap = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 64;

    if (now - lastTap.time < 300 && isNearbyTap) {
      // Double tap!
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      
      if (clickX < rect.width * 0.35) {
        handleSeekBackward(10);
      } else if (clickX > rect.width * 0.65) {
        handleSeekForward(10);
      } else {
        toggleFullscreen();
      }
    } else {
      // Single tap
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      
      if (isTouch) {
        // Delay slightly so double tap can intercept, otherwise toggle controls UI
        tapTimeoutRef.current = setTimeout(() => {
          setShowControls(prev => !prev);
        }, 320);
      } else {
        // Desktop mouse click: Toggle play/pause instantly
        togglePlay();
      }
    }
  };

  const handleVideoPointerCancel = () => {
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    lastTapRef.current = { time: 0, x: 0, y: 0 };
  };

  const getActiveSkipSegment = () => {
    const video = videoRef.current;
    if (!video) return null;
    const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : duration;
    return findActiveIntroOrOutro(
      videoData.introSkipping,
      video.currentTime,
      mediaDuration,
    );
  };

  const seekPastSkipSegment = (kind: SkipSegmentKind) => {
    if (roomHook && !isHost) return false;
    const video = videoRef.current;
    const segment = getActiveSkipSegment();
    if (!video || !segment || segment.kind !== kind) return false;

    const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : duration;
    const targetTime = mediaDuration > 0
      ? Math.min(segment.end + 0.1, mediaDuration)
      : segment.end + 0.1;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    setActiveSkipKind(null);
    return true;
  };

  const handleSkipIntro = () => {
    seekPastSkipSegment('intro');
  };

  const handleSkipOutro = () => {
    if (roomHook && !isHost) return;
    const segment = getActiveSkipSegment();
    if (!segment || segment.kind !== 'outro') return;

    setActiveSkipKind(null);
    if (onNextEpisode) {
      onNextEpisode();
      return;
    }
    seekPastSkipSegment('outro');
  };

  // Handle stream error, fallback to tunnel proxy
  const handleStreamError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    const mediaError = video.error;
    const errMsg = mediaError ? `${mediaError.code}: ${mediaError.message}` : 'unknown';
    console.error("Direct stream failed to play. URL:", currentStreamUrl, "Error:", errMsg);
    setLastErrorEvent(errMsg);

    if (!useTunnelFallback && currentStreamUrl && (currentStreamUrl.startsWith('http://') || currentStreamUrl.startsWith('https://') || currentStreamUrl.includes('.shabakaty.com'))) {
      console.warn("[SmartStream] Direct Shabakaty CDN failed, auto-switching to VPS Tunnel Proxy...");
      setUseTunnelFallback(true);
      return;
    }

    if (retryCount < MAX_RETRIES) {
      // Retry with backoff before giving up and falling back to YouTube
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      const failedUrl = currentStreamUrl;
      if (streamRetryTimeoutRef.current) clearTimeout(streamRetryTimeoutRef.current);
      streamRetryTimeoutRef.current = setTimeout(() => {
        streamRetryTimeoutRef.current = null;
        setCurrentStreamUrl((prev) => {
          if (!prev || prev !== failedUrl) return prev;
          // Clean up old retry params to prevent infinite query string growth
          const cleanUrl = prev.replace(/(&|\?)_retry=\d+_\d+/g, '');
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
    if (roomHook && !isHost) return;
    const video = videoRef.current;
    if (video) {
      const newTime = parseFloat(e.target.value);
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Track time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.paused !== isPaused) {
        setIsPaused(video.paused);
      }
      setCurrentTime(video.currentTime);

      if (isHost && roomHook) {
        const now = Date.now();
        if (now - lastSyncTimeRef.current > 1000) {
          sendSyncUpdate?.(video.currentTime, !video.paused);
          lastSyncTimeRef.current = now;
        }
      }

      // The API exposes parental scene ranges separately from intro/outro ranges.
      if (
        isFamilyMode
        && (!roomHook || isHost)
        && isParentSkippingEnabled(videoData.parent_skipping)
      ) {
        const mediaDuration = Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : duration;
        const parentalRange = findActiveParentalSkip(
          videoData.skippingDurations,
          video.currentTime,
          mediaDuration,
        );
        if (parentalRange) {
          const targetTime = mediaDuration > 0
            ? Math.min(parentalRange.end + 0.1, mediaDuration)
            : parentalRange.end + 0.1;
          video.currentTime = targetTime;
          setCurrentTime(targetTime);
          setActiveSkipKind(null);
          return;
        }
      }

      const activeSegment = findActiveIntroOrOutro(
        videoData.introSkipping,
        video.currentTime,
        Number.isFinite(video.duration) && video.duration > 0 ? video.duration : duration,
      );
      setActiveSkipKind((currentKind) => (
        currentKind === activeSegment?.kind ? currentKind : activeSegment?.kind ?? null
      ));
    }
  };

  // Load Metadata & Adaptive Aspect Ratio
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      if (video.videoWidth && video.videoHeight) {
        // Removed dynamic aspect ratio to prevent layout shift
      }
      
      if (videoData.duration) {
        const parsed = parseFloat(String(videoData.duration));
        if (!isNaN(parsed) && parsed > 0) {
          setDuration(parsed);
          handleTimeUpdate();
          return;
        }
      }
      setDuration(video.duration);
      handleTimeUpdate();
    }
  };

  // Fullscreen helper
  // In Telegram WebApp: use tg.requestFullscreen() (Bot API 8.0) which makes the
  // entire mini app fullscreen. The player then uses CSS fixed overlay.
  // In regular browsers: use element.requestFullscreen() native API.
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    const video = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    }) | null;
    const webkitDoc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const webkitContainer = container as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const isNativelyFullscreen = !!(
      document.fullscreenElement ||
      webkitDoc.webkitFullscreenElement ||
      video?.webkitDisplayingFullscreen
    );

    if (!isNativelyFullscreen) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (webkitContainer.webkitRequestFullscreen) {
          await webkitContainer.webkitRequestFullscreen();
        } else if (video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        }
      } catch (err) {
        console.error('Fullscreen request failed:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (webkitDoc.webkitExitFullscreen) {
          await webkitDoc.webkitExitFullscreen();
        } else if (video?.webkitDisplayingFullscreen && (video as any).webkitExitFullscreen) {
          (video as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.error('Exit fullscreen failed:', err);
      }
    }
  };

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '00:00';
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
    const targetUrl = getStreamTargetUrl(stream, useTunnelFallback);
    const nextStreamUrl = toProxyUrl(targetUrl);
    if (!video || !nextStreamUrl || nextStreamUrl === currentStreamUrl || stream.resolution === selectedResolution) {
      setActiveDropdown(null);
      return;
    }

    if (qualityRestoreRef.current) {
      video.removeEventListener('loadedmetadata', qualityRestoreRef.current);
      qualityRestoreRef.current = null;
    }

    if (video) {
      const savedTime = video.currentTime;
      const wasPlaying = !video.paused;

      setSelectedResolution(stream.resolution);
      setActiveDropdown(null);

      const resumeSeek = () => {
        video.currentTime = savedTime;
        if (wasPlaying) {
          video.play().catch(() => {});
        }
        video.removeEventListener('loadedmetadata', resumeSeek);
        if (qualityRestoreRef.current === resumeSeek) qualityRestoreRef.current = null;
      };
      qualityRestoreRef.current = resumeSeek;
      video.addEventListener('loadedmetadata', resumeSeek);
      setCurrentStreamUrl(nextStreamUrl);
    }
  };

  useEffect(() => () => {
    const video = videoRef.current;
    if (video && qualityRestoreRef.current) {
      video.removeEventListener('loadedmetadata', qualityRestoreRef.current);
    }
    qualityRestoreRef.current = null;
  }, []);

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
  const controlsVisible = showControls || isPaused;
  const skipActionVisible = Boolean(
    activeSkipKind && (!roomHook || isHost) && activeDropdown !== 'settings'
  );

  useEffect(() => {
    const controlsBar = controlsBarRef.current;
    if (!controlsBar) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(controlsBar.getBoundingClientRect().height);
      setControlsBarHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
    };

    updateHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(controlsBar);
    window.addEventListener('resize', updateHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [currentStreamUrl, isFullscreen, showStreamError, youtubeFallback]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      const target = e.target instanceof Element ? e.target : null;
      const activeElement = document.activeElement;
      const fullscreenElement = document.fullscreenElement
        || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      const isPlayerFullscreen = !!fullscreenElement
        && (fullscreenElement === container || !!container?.contains(fullscreenElement));
      const isInsidePlayer = !!container
        && ((!!target && container.contains(target)) || (!!activeElement && container.contains(activeElement)));

      if (!container || (!isPlayerFullscreen && !isInsidePlayer)) return;
      if (target?.closest('input, textarea, select, button, a[href], [role="button"], [contenteditable]:not([contenteditable="false"])')) return;

      const video = videoRef.current;
      if (!video || youtubeFallback) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (roomHook && !isHost) {
            if (roomState?.playing) {
              const elapsed = Math.max(0, (Date.now() - (roomState.receivedAt || Date.now())) / 1000);
              video.currentTime = Math.max(0, roomState.time + elapsed);
              video.play().catch(() => setIsPaused(true));
            } else {
              video.pause();
            }
          } else if (video.paused || video.ended) {
            video.play().catch(() => setIsPaused(true));
          } else {
            video.pause();
          }
          break;
        case 'ArrowLeft':
          if (roomHook && !isHost) break;
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          if (roomHook && !isHost) break;
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
  }, [youtubeFallback, volume, isMuted, roomHook, isHost, roomState]);

  // Control body overflow when in CSS fullscreen (Telegram context)
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, [isFullscreen]);

  // Sync fullscreen state change (e.g. Esc button pressed, or Telegram fullscreenChanged)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const webkitDocument = document as Document & { webkitFullscreenElement?: Element };
      const webkitVideo = videoRef.current as (HTMLVideoElement & { webkitDisplayingFullscreen?: boolean }) | null;
      setIsFullscreen(Boolean(document.fullscreenElement || webkitDocument.webkitFullscreenElement || webkitVideo?.webkitDisplayingFullscreen));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    const video = videoRef.current;
    video?.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
    video?.addEventListener('webkitendfullscreen', handleFullscreenChange);

    // Telegram WebApp fullscreenChanged event (Bot API 8.0)
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;
    const handleTgFullscreenChanged = () => {
      // fullscreenChanged event has no parameters — read tg.isFullscreen
      setIsFullscreen(Boolean(tg?.isFullscreen));
    };
    const handleTgFullscreenFailed = (event: { error: 'UNSUPPORTED' | 'ALREADY_FULLSCREEN' }) => {
      if (event?.error === 'ALREADY_FULLSCREEN') {
        // App is already fullscreen — ensure our state reflects this
        setIsFullscreen(true);
      } else {
        // UNSUPPORTED: device/platform does not support fullscreen
        // CSS overlay (fixed inset-0) remains active as a fallback
        console.warn('[Telegram] fullscreenFailed:', event?.error);
      }
    };
    tg?.onEvent?.('fullscreenChanged', handleTgFullscreenChanged);
    tg?.onEvent?.('fullscreenFailed', handleTgFullscreenFailed);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      video?.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
      video?.removeEventListener('webkitendfullscreen', handleFullscreenChange);
      tg?.offEvent?.('fullscreenChanged', handleTgFullscreenChanged);
      tg?.offEvent?.('fullscreenFailed', handleTgFullscreenFailed);
    };
  }, [currentStreamUrl, youtubeFallback]);

  const sortedStreams = [...streams].sort((a, b) => {
    const resA = parseInt(a.resolution) || 0;
    const resB = parseInt(b.resolution) || 0;
    return resB - resA; // Descending order: highest quality first!
  });

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #e50914 ${progressPercent}%, rgba(255, 255, 255, 0.2) ${progressPercent}%)`,
    boxShadow: '0 0 10px rgba(229,9,20,0.5), 0 0 20px rgba(229,9,20,0.3)'
  };

  // Render Helpers for Dropdown Menus (Mobile Portal vs Desktop Absolute)
  const renderSettingsMenu = () => {
    return (
      <div 
        className="relative w-full max-w-[280px] md:w-64 max-h-[80vh] md:max-h-[60vh] overflow-y-auto bg-[#121212] border border-[#e50914]/60 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.95)] flex flex-col p-4 md:p-3 animate-fade-in-up"
        onPointerUp={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* --- Main Menu --- */}
        {settingsView === 'main' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
               <div className="text-base md:text-sm text-white font-black">الإعدادات</div>
               <button 
                 onPointerUp={(e) => { e.stopPropagation(); setActiveDropdown(null); }}
                 className="w-8 h-8 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer outline-none focus:outline-none ring-0"
               >
                 <i className="fa-solid fa-xmark md:text-xs"></i>
               </button>
            </div>
            
            {/* Family Mode Switch */}
            {(!roomHook || isHost) && <div className="flex flex-row justify-between items-center px-2 py-2 hover:bg-white/5 rounded-xl transition-colors">
              <div className="flex flex-col text-right">
                <span className="font-bold text-xs text-white">وضع العائلة</span>
                <span className="text-[9px] text-gray-500 font-normal mt-0.5">تخطي تلقائي للمشاهد المخلة</span>
              </div>
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setIsFamilyMode(!isFamilyMode); }}
                className={`w-10 h-5 rounded-full relative transition-colors outline-none cursor-pointer ${isFamilyMode ? 'bg-red-600' : 'bg-white/20'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform transform-gpu ${isFamilyMode ? 'left-[2px]' : 'right-[2px]'}`}></div>
              </button>
            </div>}

            {/* Subtitles Button */}
            {vttTranslations.length > 0 && (
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setSettingsView('subtitles'); }}
                className="flex flex-row justify-between items-center px-2 py-2 hover:bg-white/5 rounded-xl transition-colors outline-none w-full cursor-pointer text-right"
              >
                <span className="font-bold text-xs text-white">الترجمة</span>
                <span className="text-xs text-white/50">{selectedLanguage === 'off' ? 'إيقاف' : selectedLanguage === 'ar' ? 'العربية' : 'English'} &lt;</span>
              </button>
            )}

            {/* Quality Button */}
            <button 
              onPointerUp={(e) => { e.stopPropagation(); setSettingsView('quality'); }}
              className="flex flex-row justify-between items-center px-2 py-2 hover:bg-white/5 rounded-xl transition-colors outline-none w-full cursor-pointer text-right"
            >
              <span className="font-bold text-xs text-white">الجودة</span>
              <span className="text-xs text-white/50">{selectedResolution} &lt;</span>
            </button>

            {/* Speed Button */}
            {!roomHook && <button
              onPointerUp={(e) => { e.stopPropagation(); setSettingsView('speed'); }}
              className="flex flex-row justify-between items-center px-2 py-2 hover:bg-white/5 rounded-xl transition-colors outline-none w-full cursor-pointer text-right"
            >
              <span className="font-bold text-xs text-white">سرعة التشغيل</span>
              <span className="text-xs text-white/50">{playbackRate}x &lt;</span>
            </button>}
          </div>
        )}

        {/* --- Subtitles Sub-menu --- */}
        {settingsView === 'subtitles' && (
          <div className="flex flex-col gap-1 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setSettingsView('main'); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
              <div className="text-base md:text-sm text-white font-black">الترجمة</div>
            </div>
            
            <div className="text-[10px] text-gray-400 font-bold mb-1">لغة الترجمة</div>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setSelectedLanguage('off'); }}
                className={`px-2 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer outline-none focus:outline-none ring-0 ${selectedLanguage === 'off' ? 'bg-alex-primary text-white shadow' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
              >
                إيقاف
              </button>
              {vttTranslations.map((track) => (
                <button 
                  key={track.id}
                  onPointerUp={(e) => { e.stopPropagation(); setSelectedLanguage(track.type); }}
                  className={`px-2 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer outline-none focus:outline-none ring-0 ${selectedLanguage === track.type ? 'bg-alex-primary text-white shadow' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                >
                  {track.name === 'arabic' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-gray-400 font-bold mb-1">نوع الخط</div>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {[
                { name: 'Tajawal', label: 'تجول' },
                { name: 'Cairo', label: 'القاهرة' },
                { name: 'Amiri', label: 'أميري' }
              ].map((f) => (
                <button
                  key={f.name}
                  onPointerUp={(e) => { e.stopPropagation(); setSelectedFont(f.name); }}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer outline-none focus:outline-none ring-0 ${selectedFont === f.name ? 'bg-white text-black' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                  style={{ fontFamily: f.name }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 mb-2">
              <span className="text-[11px] text-gray-300 font-bold">حجم الخط</span>
              <div className="flex items-center gap-2.5">
                <button 
                  onPointerUp={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.min(220, prev + 10)); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-alex-primary text-white transition-all cursor-pointer outline-none"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                </button>
                <span className="text-xs font-en font-bold text-white min-w-[36px] text-center">{subtitleSize}%</span>
                <button 
                  onPointerUp={(e) => { e.stopPropagation(); setSubtitleSize(prev => Math.max(60, prev - 10)); }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-alex-primary text-white transition-all cursor-pointer outline-none"
                >
                  <i className="fa-solid fa-minus text-xs"></i>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <span className="text-[11px] text-gray-300 font-bold">خلفية سوداء</span>
              <button
                onPointerUp={(e) => { e.stopPropagation(); setShowSubtitleBg(prev => !prev); }}
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 outline-none flex items-center cursor-pointer ${
                  showSubtitleBg ? 'bg-alex-primary justify-end' : 'bg-white/20 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow shadow-md transform will-change-transform"></span>
              </button>
            </div>
          </div>
        )}

        {/* --- Quality Sub-menu --- */}
        {settingsView === 'quality' && (
          <div className="flex flex-col gap-1 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setSettingsView('main'); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
              <div className="text-base md:text-sm text-white font-black">الجودة</div>
            </div>
            <div className="flex flex-col max-h-[30vh] overflow-y-auto gap-1">
              {sortedStreams.map((stream) => (
                <button 
                  key={stream.name}
                  onPointerUp={(e) => { e.stopPropagation(); handleQualityChange(stream); setActiveDropdown(null); }}
                  className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ring-0 ${selectedResolution === stream.resolution ? 'bg-alex-primary text-white shadow' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                >
                  {stream.resolution}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- Speed Sub-menu --- */}
        {settingsView === 'speed' && (
          <div className="flex flex-col gap-1 animate-fade-in-up font-en">
            <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2 font-ar" dir="rtl">
              <button 
                onPointerUp={(e) => { e.stopPropagation(); setSettingsView('main'); }}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
              <div className="text-base md:text-sm text-white font-black">سرعة التشغيل</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                <button 
                  key={rate}
                  onPointerUp={(e) => { e.stopPropagation(); if (!roomHook) setPlaybackRate(rate); setActiveDropdown(null); }}
                  className={`w-full text-center py-2 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus:outline-none ring-0 ${playbackRate === rate ? 'bg-alex-primary text-white shadow' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
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
        <div className="absolute top-4 right-4 ios-glass px-4 py-2 rounded-xl text-xs font-bold text-yellow-400 flex items-center gap-2 border border-yellow-500/20 shadow-lg z-10 animate-pulse">
          <i className="fa-solid fa-triangle-exclamation"></i>
          يتم تشغيل الإعلان الترويجي (جاري محاولة الاتصال بالخادم الرئيسي...)
        </div>
      </div>
    );
  }

  // HTML5 Cinema Player with Custom UI Controls
  if (currentStreamUrl && !showStreamError) {
    // Core player content — shared between normal and fullscreen modes
    const playerContent = (
      <div 
        ref={containerRef}
        tabIndex={0}
        aria-label="مشغل الفيديو"
        className={`relative select-none group/player transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] min-h-[200px] w-full bg-black ${
          isFullscreen 
            ? 'h-full rounded-none border-none shadow-none'
            : 'rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.15)] hover:shadow-[0_0_60px_rgba(229,9,20,0.25)] border border-white/10 aspect-video'
        }`}
        style={{ aspectRatio: isFullscreen ? 'auto' : 16/9 }}
        dir="ltr"
      >
        {/* Inner wrapper for rounded corners and overflow clipping to not affect dropdowns */}
        <div className={`absolute inset-0 w-full h-full pointer-events-none ${isFullscreen ? 'rounded-none' : 'rounded-3xl overflow-hidden'}`}>
          {/* Adaptive Ambient Light Canvas */}
          <canvas
            ref={canvasRef}
            width="64"
            height="36"
            className="absolute inset-0 w-full h-full scale-110 blur-[80px] opacity-60 mix-blend-screen transition-opacity duration-1000 z-[-1]"
            style={{ transform: 'scale(1.15)' }}
          />
          {/* Fallback Glow */}
          <div className="absolute inset-0 z-[-2] opacity-10 blur-[100px] scale-105 bg-[#e50914]/20"></div>
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
          <style>{`
            video {
              object-fit: cover !important;
              width: 100% !important;
              height: 100% !important;
            }
            /* Completely hide native subtitles so our React custom overlay can handle them flawlessly */
            video::-webkit-media-text-track-display {
              display: none !important;
              opacity: 0 !important;
            }
            video::cue {
              color: transparent !important;
              background: transparent !important;
              opacity: 0 !important;
              text-shadow: none !important;
            }
          `}</style>
          <video
            ref={videoRef}
            className="h-full w-full cursor-pointer object-cover"
            style={videoZoomStyle}
            onPointerUp={handleVideoPointerUp}
            onPointerCancel={handleVideoPointerCancel}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPaused(true)}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleStreamError}
            onPlay={() => {
              if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
              }
              setIsWaiting(false);
              setIsPaused(false);
              if (isHost && roomHook && videoRef.current) {
                sendSyncUpdate?.(videoRef.current.currentTime, true);
                lastSyncTimeRef.current = Date.now();
              }
            }}
            onPause={(event) => {
              const video = event.currentTarget;
              requestAnimationFrame(() => {
                if (!video.paused) return;
                setIsPaused(true);
                if (isHost && roomHook) {
                  sendSyncUpdate?.(video.currentTime, false);
                  lastSyncTimeRef.current = Date.now();
                }
              });
            }}
            onWaiting={() => {
              if (!waitingTimeoutRef.current) {
                waitingTimeoutRef.current = setTimeout(() => setIsWaiting(true), 1000);
              }
            }}
            onSeeking={() => {
              if (!waitingTimeoutRef.current) {
                waitingTimeoutRef.current = setTimeout(() => setIsWaiting(true), 1000);
              }
            }}
            onSeeked={() => {
              if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
              }
              setIsWaiting(false);
              if (isHost && roomHook && videoRef.current) {
                sendSyncUpdate?.(videoRef.current.currentTime, !videoRef.current.paused);
                lastSyncTimeRef.current = Date.now();
              }
              handleTimeUpdate();
            }}
            onPlaying={() => {
              if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
              }
              setIsWaiting(false);
              setIsPaused(false);
            }}
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
                onLoad={handleTimeUpdate}
              />
            ))}
          </video>
        </div>

        {/* Loading Spinner */}
        {isWaiting && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="w-16 h-16 border-4 border-white/20 border-t-red-600 rounded-full animate-spin"></div>
          </div>
        )}

        {showZoomIndicator && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top,0px)+3.25rem)] z-50 -translate-x-1/2 rounded-full border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-black text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            dir="ltr"
          >
            <span className="flex items-center gap-2">
              <i className={`fa-solid ${isZoomed ? 'fa-compress' : 'fa-expand'} text-[11px] text-red-300`}></i>
              {zoomPercent}%
            </span>
          </div>
        )}

        {/* Custom React Subtitle Overlay (100% Real-time styling) */}
        {currentSubtitle && (
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-[92%] text-center pointer-events-none flex flex-col items-center justify-end z-20 transition-all duration-300 px-4"
            style={{ 
               bottom: controlsVisible
                 ? `calc(${controlsBarHeight || (isMobile ? 80 : 136)}px + 0.5rem)`
                 : 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
               paddingLeft: '0px',
               paddingRight: '0px'
            }}
          >
            {currentSubtitle.split('\n').map((line, idx) => (
              <span 
                key={idx} 
                className="inline-block max-w-full text-center"
                style={{
                  fontSize: `${(subtitleSize / 100) * (isMobile ? 16 : 24)}px`,
                  fontFamily: `'${selectedFont}', 'Outfit', sans-serif`,
                  backgroundColor: showSubtitleBg ? 'rgba(0,0,0,0.65)' : 'transparent',
                  color: 'white',
                  padding: showSubtitleBg ? '4px 12px' : '0',
                  borderRadius: showSubtitleBg ? '6px' : '0',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  textShadow: showSubtitleBg ? 'none' : '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.95)',
                  margin: '0 auto'
                }}
              >
                {line}
              </span>
            ))}
          </div>
        )}



        {/* Big Pulsing Center Play Button */}
        {isPaused && !isWaiting && (
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label="استئناف تشغيل الفيديو"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-alex-primary/95 text-white shadow-[0_0_36px_rgba(229,9,20,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 z-20 cursor-pointer outline-none focus:outline-none ring-0"
          >
            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
              <i className="fa-solid fa-play text-[30px]"></i>
            </span>
          </button>
        )}

        {/* TOP TITLE BAR */}
        <div aria-hidden={!(showControls || isPaused)} className={`absolute top-0 inset-x-0 ${isFullscreen ? '' : 'rounded-t-3xl'} p-2.5 px-3 pb-4 md:p-4 md:pb-6 bg-gradient-to-b from-black/50 to-transparent flex flex-row-reverse items-center justify-between transition-all duration-300 transform z-20 ${showControls || isPaused ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          <h3 className="text-white text-xs md:text-lg font-black drop-shadow-md flex items-center gap-2 md:gap-3" dir="rtl">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-alex-primary animate-pulse"></span>
            {videoData.ar_title}
          </h3>
        </div>

        {/* Skip action: physical right edge, clear of controls and device safe areas. */}
        {skipActionVisible && activeSkipKind && (
          <div
            className="pointer-events-none absolute inset-x-0 z-40 flex items-center justify-end transition-[bottom] duration-300 ease-out"
            style={{
              bottom: controlsVisible
                ? isFullscreen
                  ? `calc(clamp(6.75rem, 9.5vw, 7.75rem) + env(safe-area-inset-bottom, 0px))`
                  : `calc(clamp(5.75rem, 8.5vw, 6.5rem) + env(safe-area-inset-bottom, 0px))`
                : `calc(clamp(2rem, 4vw, 2.5rem) + env(safe-area-inset-bottom, 0px))`,
              paddingLeft: 'max(clamp(0.15rem, 0.8vw, 0.5rem), env(safe-area-inset-left, 0px))',
              paddingRight: 'max(clamp(0.15rem, 0.8vw, 0.5rem), env(safe-area-inset-right, 0px))',
            }}
            dir="ltr"
          >
            <button
              type="button"
              onClick={activeSkipKind === 'intro' ? handleSkipIntro : handleSkipOutro}
              aria-label={activeSkipKind === 'intro' ? 'تخطي المقدمة' : onNextEpisode ? 'الانتقال إلى الحلقة التالية' : 'تخطي الخاتمة'}
              dir="rtl"
              className="pointer-events-auto flex min-h-[30px] max-w-full origin-right touch-manipulation items-center justify-center gap-1 rounded-md border border-white/10 bg-black/85 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl backdrop-blur-md transition-all duration-200 hover:border-white hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95 md:min-h-[32px] md:px-3 md:text-xs cursor-pointer"
            >
              <i 
                aria-hidden="true" 
                className={`fa-solid ${activeSkipKind === 'intro' ? 'fa-forward-step' : 'fa-forward'} text-[10px] md:text-xs leading-none`}
              />
              <span className="leading-none tracking-normal font-bold">
                {activeSkipKind === 'intro'
                  ? 'تخطي المقدمة'
                  : onNextEpisode ? 'الحلقة التالية' : 'تخطي الخاتمة'}
              </span>
            </button>
          </div>
        )}

        {/* BOTTOM CUSTOM CONTROL BAR */}
        <div
          ref={controlsBarRef}
          aria-hidden={!controlsVisible}
          className={`absolute bottom-0 inset-x-0 ${isFullscreen ? '' : 'rounded-b-3xl'} p-2 pt-6 pb-[calc(env(safe-area-inset-bottom)+4px)] md:pb-8 md:pt-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-1.5 md:gap-3 transition-all duration-300 transform z-30 ${showControls || isPaused ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
          style={{
            paddingLeft: 'max(clamp(0.5rem, 2vw, 1.5rem), env(safe-area-inset-left, 0px))',
            paddingRight: 'max(clamp(0.5rem, 2vw, 1.5rem), env(safe-area-inset-right, 0px))',
          }}
        >
          
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
              aria-label="موضع تشغيل الفيديو"
              style={progressStyle}
              className="flex-grow h-1 md:h-1.5 rounded-lg appearance-none cursor-pointer accent-alex-primary hover:h-1.5 md:hover:h-2 transition-all outline-none border border-[#e50914]/30"
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
                aria-label={isPaused ? 'تشغيل الفيديو' : 'إيقاف الفيديو مؤقتاً'}
                className="text-white hover:text-alex-primary text-lg md:text-2xl transition-colors cursor-pointer outline-none focus:outline-none ring-0 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center"
              >
                <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
              </button>

              {/* Next Episode Button (Series only) */}
              {onNextEpisode && (
                <button 
                  onClick={onNextEpisode} 
                  className="text-white hover:text-alex-primary text-lg md:text-2xl transition-colors cursor-pointer outline-none focus:outline-none ring-0 w-8 h-8 md:w-6 md:h-6 flex items-center justify-center"
                  title="الحلقة التالية"
                >
                  <i className="fa-solid fa-forward-step"></i>
                </button>
              )}

              {/* Volume Controller */}
              <div className="hidden md:flex items-center gap-2 group/volume relative">
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  aria-label={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
                  className="text-white hover:text-alex-primary text-base md:text-xl transition-colors cursor-pointer outline-none focus:outline-none ring-0 w-6 h-6 flex items-center justify-center"
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
                  aria-label="مستوى الصوت"
                  className="w-0 group-hover/volume:w-20 h-1 bg-white/20 rounded accent-alex-primary transition-all duration-300 opacity-0 group-hover/volume:opacity-100 cursor-pointer"
                />
              </div>

            </div>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-1 md:gap-4 flex-nowrap">

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleZoom();
                }}
                aria-label={isZoomed ? 'إعادة الفيديو إلى الحجم الملائم' : 'تكبير الفيديو لملء الإطار'}
                aria-pressed={isZoomed}
                title={isZoomed ? 'ملاءمة الفيديو' : 'تكبير الفيديو'}
                className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all duration-300 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 md:h-10 md:w-10 md:rounded-xl ${
                  isZoomed
                    ? 'border-red-400/50 bg-red-500/25 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                    : 'border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span className={`inline-flex items-center justify-center transition-all duration-300 ease-out transform ${isZoomed ? 'rotate-180 scale-110' : 'rotate-0 scale-100'}`}>
                  <i className={`fa-solid ${isZoomed ? 'fa-compress' : 'fa-expand'} text-sm md:text-base`}></i>
                </span>
              </button>
              
              {/* Settings Menu */}
              <div className="static md:relative dropdown-container">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')}
                  className={`flex items-center justify-center gap-1.5 h-8 md:h-10 px-2 md:px-3 rounded-lg md:rounded-xl border text-[10px] md:text-xs font-black transition-all cursor-pointer outline-none focus:outline-none ring-0 min-w-[32px] md:min-w-[40px] ${
                    activeDropdown === 'settings'
                      ? 'bg-alex-primary/20 text-alex-primary border-alex-primary/30 shadow' 
                      : 'ios-button text-gray-300 border-white/5 hover:ios-active'
                  }`}
                  title="الإعدادات"
                >
                  <i className="fa-solid fa-cog text-sm md:text-base"></i>
                  <span className="hidden md:inline">الإعدادات</span>
                </button>

                {activeDropdown === 'settings' && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 origin-bottom-right scale-90 sm:scale-100">
                    {renderSettingsMenu()}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'الخروج من ملء الشاشة' : 'ملء الشاشة'}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/5 text-sm text-white transition-all duration-200 hover:scale-110 active:scale-90 hover:border-white/15 hover:bg-white/5 hover:text-alex-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 md:h-10 md:w-10 md:rounded-xl md:text-base"
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-minimize' : 'fa-maximize'} transition-transform duration-200 transform ${isFullscreen ? 'scale-105' : 'scale-100'}`}></i>
              </button>

            </div>

          </div>

        </div>

      </div>
    );

    return playerContent;
  }

  // Loading skeleton while stream is initializing
  if (isInitializing || (!currentStreamUrl && !showStreamError && (videoData.stream_url || (streams && streams.length > 0)))) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center bg-black/90 rounded-3xl border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-alex-primary/10 via-transparent to-transparent animate-pulse pointer-events-none" />
        <div className="w-16 h-16 rounded-full border-4 border-alex-primary/30 border-t-alex-primary animate-spin mb-4" />
        <p className="text-white font-bold text-sm tracking-wide">جاري تحضير المشغل...</p>
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
            className="px-6 py-2 bg-alex-primary text-white rounded-xl font-bold text-sm hover:bg-alex-primary/80 transition-colors cursor-pointer outline-none focus:outline-none ring-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}
