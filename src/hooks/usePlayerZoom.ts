'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 1.6;
const ZOOM_SNAP_THRESHOLD = 1.035;
const PINCH_SENSITIVITY = 0.86;

interface ZoomOrigin {
  x: number;
  y: number;
}

interface UsePlayerZoomOptions<TContainer extends HTMLElement> {
  containerRef: RefObject<TContainer | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isFullscreen: boolean;
  resetKey: string;
  surfaceKey: string | null;
  onPinchStart?: () => void;
  onPinchEnd?: () => void;
}

const clamp = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, value))
);

const getTouchDistance = (touches: TouchList) => Math.hypot(
  touches[0].clientX - touches[1].clientX,
  touches[0].clientY - touches[1].clientY,
);

/**
 * Smooth, bounded player zoom shared by the touch and desktop players.
 * Native listeners are deliberately non-passive only on the video surface so
 * iOS/iPadOS and Android cannot zoom the page while a two-finger video pinch
 * is active. Normal page scrolling remains available everywhere else.
 */
export function usePlayerZoom<TContainer extends HTMLElement>({
  containerRef,
  videoRef,
  isFullscreen,
  resetKey,
  surfaceKey,
  onPinchStart,
  onPinchEnd,
}: UsePlayerZoomOptions<TContainer>) {
  const [zoomScale, setZoomScale] = useState(MIN_ZOOM);
  const [zoomOrigin, setZoomOrigin] = useState<ZoomOrigin>({ x: 50, y: 50 });
  const [isPinching, setIsPinching] = useState(false);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);

  const zoomScaleRef = useRef(MIN_ZOOM);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(MIN_ZOOM);
  const pinchActiveRef = useRef(false);
  const pendingScaleRef = useRef(MIN_ZOOM);
  const animationFrameRef = useRef<number | null>(null);
  const indicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressTapUntilRef = useRef(0);
  const onPinchStartRef = useRef(onPinchStart);
  const onPinchEndRef = useRef(onPinchEnd);

  useEffect(() => {
    onPinchStartRef.current = onPinchStart;
  }, [onPinchStart]);

  useEffect(() => {
    onPinchEndRef.current = onPinchEnd;
  }, [onPinchEnd]);

  const clearIndicatorTimeout = useCallback(() => {
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
      indicatorTimeoutRef.current = null;
    }
  }, []);

  const scheduleScale = useCallback((value: number) => {
    const nextScale = clamp(value, MIN_ZOOM, MAX_ZOOM);
    zoomScaleRef.current = nextScale;
    pendingScaleRef.current = nextScale;

    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setZoomScale(pendingScaleRef.current);
    });
  }, []);

  const revealIndicator = useCallback((hideAfterMs?: number) => {
    clearIndicatorTimeout();
    setShowZoomIndicator(true);
    if (hideAfterMs) {
      indicatorTimeoutRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
        indicatorTimeoutRef.current = null;
      }, hideAfterMs);
    }
  }, [clearIndicatorTimeout]);

  const resetZoom = useCallback((announce = false) => {
    pinchActiveRef.current = false;
    pinchStartDistanceRef.current = null;
    setIsPinching(false);
    setZoomOrigin({ x: 50, y: 50 });
    scheduleScale(MIN_ZOOM);
    if (announce) revealIndicator(800);
  }, [revealIndicator, scheduleScale]);

  const getSmartZoomTarget = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video || !video.videoWidth || !video.videoHeight) return 1.2;

    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return 1.2;

    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = rect.width / rect.height;
    const coverScale = Math.max(
      videoAspect / containerAspect,
      containerAspect / videoAspect,
    );

    // The button reaches a useful fill level without an unexpectedly deep crop.
    return clamp(Math.max(1.18, coverScale), 1.18, 1.48);
  }, [containerRef, videoRef]);

  const toggleZoom = useCallback(() => {
    pinchActiveRef.current = false;
    pinchStartDistanceRef.current = null;
    setIsPinching(false);
    setZoomOrigin({ x: 50, y: 50 });
    scheduleScale(zoomScaleRef.current > ZOOM_SNAP_THRESHOLD ? MIN_ZOOM : getSmartZoomTarget());
    suppressTapUntilRef.current = performance.now() + 300;
    revealIndicator(900);
  }, [getSmartZoomTarget, revealIndicator, scheduleScale]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) resetZoom(false);
    });
    return () => { cancelled = true; };
  }, [resetKey, resetZoom]);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const beginPinch = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      const distance = getTouchDistance(event.touches);
      if (!Number.isFinite(distance) || distance <= 0) return;

      const rect = container.getBoundingClientRect();
      const midpointX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midpointY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

      pinchStartDistanceRef.current = distance;
      pinchStartScaleRef.current = zoomScaleRef.current;
      pinchActiveRef.current = true;
      suppressTapUntilRef.current = performance.now() + 500;
      setZoomOrigin({
        x: clamp(((midpointX - rect.left) / Math.max(rect.width, 1)) * 100, 10, 90),
        y: clamp(((midpointY - rect.top) / Math.max(rect.height, 1)) * 100, 10, 90),
      });
      setIsPinching(true);
      revealIndicator();
      onPinchStartRef.current?.();
    };

    const updatePinch = (event: TouchEvent) => {
      const startDistance = pinchStartDistanceRef.current;
      if (!pinchActiveRef.current || event.touches.length !== 2 || !startDistance) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      const distanceRatio = getTouchDistance(event.touches) / startDistance;
      const softenedRatio = Math.pow(Math.max(distanceRatio, 0.01), PINCH_SENSITIVITY);
      scheduleScale(pinchStartScaleRef.current * softenedRatio);
      suppressTapUntilRef.current = performance.now() + 500;
    };

    const finishPinch = (event: TouchEvent) => {
      if (!pinchActiveRef.current || event.touches.length >= 2) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();

      // Keep suppressing synthetic pointer/tap events until every finger has
      // left the screen. Otherwise a slow second-finger release can toggle
      // playback immediately after a successful pinch.
      suppressTapUntilRef.current = performance.now() + 650;
      if (event.touches.length > 0) return;

      pinchActiveRef.current = false;
      pinchStartDistanceRef.current = null;
      setIsPinching(false);

      if (zoomScaleRef.current < ZOOM_SNAP_THRESHOLD) {
        setZoomOrigin({ x: 50, y: 50 });
        scheduleScale(MIN_ZOOM);
      } else {
        scheduleScale(Math.round(zoomScaleRef.current * 100) / 100);
      }
      revealIndicator(850);
      onPinchEndRef.current?.();
    };

    const preventSafariGesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };

    video.addEventListener('touchstart', beginPinch, { passive: false });
    video.addEventListener('touchmove', updatePinch, { passive: false });
    video.addEventListener('touchend', finishPinch, { passive: false });
    video.addEventListener('touchcancel', finishPinch, { passive: false });
    video.addEventListener('gesturestart', preventSafariGesture, { passive: false });
    video.addEventListener('gesturechange', preventSafariGesture, { passive: false });
    video.addEventListener('gestureend', preventSafariGesture, { passive: false });

    return () => {
      video.removeEventListener('touchstart', beginPinch);
      video.removeEventListener('touchmove', updatePinch);
      video.removeEventListener('touchend', finishPinch);
      video.removeEventListener('touchcancel', finishPinch);
      video.removeEventListener('gesturestart', preventSafariGesture);
      video.removeEventListener('gesturechange', preventSafariGesture);
      video.removeEventListener('gestureend', preventSafariGesture);
    };
  }, [containerRef, revealIndicator, scheduleScale, surfaceKey, videoRef]);

  useEffect(() => () => {
    clearIndicatorTimeout();
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
  }, [clearIndicatorTimeout]);

  const videoZoomStyle: CSSProperties = {
    touchAction: isFullscreen ? 'none' : 'pan-y',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    transform: `translateZ(0) scale(${zoomScale})`,
    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
    transition: isPinching ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: isPinching || zoomScale > ZOOM_SNAP_THRESHOLD ? 'transform' : 'auto',
    objectFit: 'cover',
    width: '100%',
    height: '100%',
  };

  return {
    isPinching,
    isZoomed: zoomScale > ZOOM_SNAP_THRESHOLD,
    showZoomIndicator,
    shouldSuppressTap: () => performance.now() < suppressTapUntilRef.current,
    toggleZoom,
    videoZoomStyle,
    zoomPercent: Math.round(zoomScale * 100),
  };
}
