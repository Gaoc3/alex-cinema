'use client';

import { useEffect } from 'react';

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [650, 1600];
const FALLBACK_IMAGE = '/media-placeholder.svg';

interface RecoveryState {
  source: string;
  attempt: number;
  timer?: number;
}

function getRecoverableMediaSource(source: string) {
  try {
    const url = new URL(source, window.location.origin);
    if (
      url.origin !== window.location.origin
      || (url.pathname !== '/api/img' && !url.pathname.startsWith('/tunnel/'))
    ) {
      return null;
    }

    url.searchParams.delete('ir');
    return url.href;
  } catch {
    return null;
  }
}

function isFallbackSource(source: string) {
  try {
    return new URL(source, window.location.origin).pathname === FALLBACK_IMAGE;
  } catch {
    return false;
  }
}

function retryUrl(source: string, attempt: number) {
  const url = new URL(source, window.location.origin);
  url.searchParams.set('ir', `${attempt}-${Date.now()}`);
  return url.href;
}

export default function ImageRecovery() {
  useEffect(() => {
    const recoveryStates = new WeakMap<HTMLImageElement, RecoveryState>();
    const timers = new Set<number>();

    const clearPendingTimer = (state?: RecoveryState) => {
      if (state?.timer === undefined) return;
      window.clearTimeout(state.timer);
      timers.delete(state.timer);
      state.timer = undefined;
    };

    const recoverImage = (image: HTMLImageElement) => {
      const source = image.src || image.currentSrc;
      if (image.dataset.alexMediaFallback === 'true') {
        if (isFallbackSource(source)) return;
        delete image.dataset.alexMediaFallback;
      }

      const recoverableSource = getRecoverableMediaSource(source);
      if (!recoverableSource) return;

      const previousState = recoveryStates.get(image);
      const state = previousState?.source === recoverableSource
        ? previousState
        : { source: recoverableSource, attempt: 0 };

      if (previousState && previousState !== state) clearPendingTimer(previousState);
      if (state.timer !== undefined) return;
      recoveryStates.set(image, state);

      if (state.attempt < MAX_RETRIES) {
        state.attempt += 1;
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          state.timer = undefined;
          if (!image.isConnected) return;

          const currentSource = getRecoverableMediaSource(image.src || image.currentSrc);
          if (currentSource !== state.source) return;

          image.removeAttribute('srcset');
          image.src = retryUrl(state.source, state.attempt);
        }, RETRY_DELAYS_MS[state.attempt - 1] + Math.round(Math.random() * 350));
        state.timer = timer;
        timers.add(timer);
        return;
      }

      recoveryStates.delete(image);
      image.dataset.alexMediaFallback = 'true';
      image.removeAttribute('srcset');
      image.src = FALLBACK_IMAGE;
    };

    const handleImageError = (event: Event) => {
      const image = event.target;
      if (image instanceof HTMLImageElement) recoverImage(image);
    };

    const handleImageLoad = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;

      const state = recoveryStates.get(image);
      clearPendingTimer(state);
      recoveryStates.delete(image);
      if (!isFallbackSource(image.src || image.currentSrc)) {
        delete image.dataset.alexMediaFallback;
      }
    };

    document.addEventListener('error', handleImageError, true);
    document.addEventListener('load', handleImageLoad, true);

    // Server-rendered images can fail before React attaches this listener.
    document.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
      if (image.complete && image.naturalWidth === 0) recoverImage(image);
    });

    return () => {
      document.removeEventListener('error', handleImageError, true);
      document.removeEventListener('load', handleImageLoad, true);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return null;
}
