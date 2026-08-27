'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useUnifiedAuth } from '@/components/auth/UnifiedAuthProvider';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';

export interface FavoriteItem {
  id: string;
  mediaId: string;
  mediaType: 'movie' | 'tv' | string;
  title: string;
  posterPath: string | null;
  createdAt?: string;
}

const STORAGE_KEY = 'alex_favorites_cache_v1';
const EVENT_NAME = 'alex-favorites-updated';

let globalFavorites: FavoriteItem[] = [];
let isInitialFetchDone = false;
let isFetchingInProgress = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        globalFavorites = parsed;
      }
    }
  } catch {}
}

function getFavoritesSnapshot() {
  return globalFavorites;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFavorites() {
  const { isSignedIn, isLoaded, user } = useUnifiedAuth();
  const { getToken } = useAuth();
  const favorites = useSyncExternalStore(subscribe, getFavoritesSnapshot, () => []);
  const [loading, setLoading] = useState(!isInitialFetchDone && favorites.length === 0);

  const refreshFavorites = useCallback(async (force = false) => {
    if (!isLoaded || (!isSignedIn && !user)) {
      setLoading(false);
      return;
    }
    if (isFetchingInProgress && !force) return;

    isFetchingInProgress = true;
    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/favorites', { headers, cache: 'no-store' });
      const data = await res.json();

      if (data.success && Array.isArray(data.favorites)) {
        globalFavorites = data.favorites;
        isInitialFetchDone = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(globalFavorites));
        } catch {}
        notifyListeners();
      }
    } catch (err) {
      console.error('Failed to refresh favorites:', err);
    } finally {
      isFetchingInProgress = false;
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, user, getToken]);

  useEffect(() => {
    if (isSignedIn || user) {
      refreshFavorites();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user, refreshFavorites]);

  const isFavorite = useCallback(
    (mediaId: string | number, mediaType?: 'movie' | 'tv' | string) => {
      const targetId = String(mediaId).trim();
      return globalFavorites.some((item) => {
        if (item.mediaId !== targetId) return false;
        if (mediaType && item.mediaType !== mediaType) return false;
        return true;
      });
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (item: {
      mediaId: string | number;
      mediaType: 'movie' | 'tv';
      title: string;
      posterPath?: string | null;
    }) => {
      if (!isLoaded || (!isSignedIn && !user)) {
        toast.error('يجب تسجيل الدخول لإضافة المفضلات');
        return false;
      }

      const mediaIdStr = String(item.mediaId).trim();
      const existingIndex = globalFavorites.findIndex(
        (f) => f.mediaId === mediaIdStr && f.mediaType === item.mediaType
      );
      const currentlyFavorite = existingIndex !== -1;
      const desiredState = !currentlyFavorite;
      const previousState = [...globalFavorites];

      if (desiredState) {
        const optimisticItem: FavoriteItem = {
          id: `temp_${Date.now()}_${mediaIdStr}`,
          mediaId: mediaIdStr,
          mediaType: item.mediaType,
          title: item.title || 'عمل فني',
          posterPath: item.posterPath || null,
          createdAt: new Date().toISOString(),
        };
        globalFavorites = [optimisticItem, ...globalFavorites.filter((f) => f.mediaId !== mediaIdStr)];
      } else {
        globalFavorites = globalFavorites.filter(
          (f) => !(f.mediaId === mediaIdStr && f.mediaType === item.mediaType)
        );
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(globalFavorites));
      } catch {}
      notifyListeners();

      if (desiredState) {
        toast.success(`تمت إضافة ${item.title || 'العمل'} إلى المفضلة`, { id: `fav-${mediaIdStr}` });
      } else {
        toast(`تمت إزالة ${item.title || 'العمل'} من المفضلة`, { id: `fav-${mediaIdStr}` });
      }

      try {
        const token = await getToken().catch(() => null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mediaId: mediaIdStr,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath,
            isFavorite: desiredState,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Server rejected favorite change');
        }
        return desiredState;
      } catch (err) {
        console.error('Failed to sync favorite with server, reverting...', err);
        globalFavorites = previousState;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(globalFavorites));
        } catch {}
        notifyListeners();
        toast.error('حدث خطأ أثناء حفظ المفضلة على الخادم');
        return currentlyFavorite;
      }
    },
    [isLoaded, isSignedIn, user, getToken]
  );

  const removeFavorite = useCallback(
    async (mediaId: string | number, mediaType: 'movie' | 'tv' | string) => {
      const mediaIdStr = String(mediaId).trim();
      const existing = globalFavorites.find(
        (f) => f.mediaId === mediaIdStr && f.mediaType === mediaType
      );
      if (!existing) return;

      return toggleFavorite({
        mediaId: mediaIdStr,
        mediaType: mediaType as 'movie' | 'tv',
        title: existing.title,
        posterPath: existing.posterPath,
      });
    },
    [toggleFavorite]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    refreshFavorites,
  };
}
