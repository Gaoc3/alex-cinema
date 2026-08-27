'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { decryptData } from '@/utils/cryptoHelper';
import WatchLayout from './watch/WatchLayout';
import { useUnifiedAuth } from './auth/UnifiedAuthProvider';
import { useAuth } from '@clerk/nextjs';
import { useFavorites } from '@/hooks/useFavorites';
import toast from 'react-hot-toast';
import type { WatchRoomHook } from '@/hooks/useWatchRoom';

interface Stream {
  name: string;
  resolution: string;
  container: string;
  videoUrl: string;
}

interface Episode {
  nb: string;
  ar_title: string;
  en_title: string;
  episodeNummer: string;
  season: string;
  duration?: string;
  publishDate?: string;
  stars?: string;
  ar_content?: string;
}

interface Season {
  season: string;
}

interface VideoData {
  nb: string | number;
  kind?: string;
  Likes?: string | number;
  DisLikes?: string | number;
  streams?: Stream[];
  ar_title: string;
  en_title?: string;
  ar_content?: string;
  img?: string | null;
  [key: string]: unknown;
}

interface EpisodeDetails extends Record<string, unknown> {
  streams: Stream[];
}

const compareEpisodes = (a: Episode, b: Episode) => {
  const seasonDifference = (parseInt(a.season) || 0) - (parseInt(b.season) || 0);
  if (seasonDifference !== 0) return seasonDifference;
  return (parseInt(a.episodeNummer) || 0) - (parseInt(b.episodeNummer) || 0);
};

interface WatchContainerProps {
  video: VideoData;
  episodes: Episode[];
  seasons: Season[];
  roomHook?: WatchRoomHook;
}

export default function WatchContainer({ video, seasons, episodes, roomHook }: WatchContainerProps) {
  const isSeries = video.kind === '2';
  
  // For series, active episode state. Default to first episode of first season.
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [activeEpisodeDetails, setActiveEpisodeDetails] = useState<EpisodeDetails | null>(null);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const favoriteList: string[] = [];
  const episodeRequestControllerRef = useRef<AbortController | null>(null);
  const episodeRequestIdRef = useRef(0);

  // Likes and Dislikes States
  const [likes, setLikes] = useState<number>(0);
  const [dislikes, setDislikes] = useState<number>(0);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

  // Initialize Likes/Dislikes and User Vote from localStorage
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLikes(parseInt(String(video.Likes || '0')));
      setDislikes(parseInt(String(video.DisLikes || '0')));

      if (typeof window !== 'undefined') {
        const savedVote = localStorage.getItem(`alex_vote_${video.nb}`);
        setUserVote(savedVote === 'like' || savedVote === 'dislike' ? savedVote : null);
      }
    });
    return () => { cancelled = true; };
  }, [video.nb, video.Likes, video.DisLikes]);

  const handleVote = (type: 'like' | 'dislike') => {
    if (typeof window === 'undefined') return;
    
    if (userVote === type) {
      // Undo current vote
      if (type === 'like') {
        setLikes(prev => Math.max(0, prev - 1));
      } else {
        setDislikes(prev => Math.max(0, prev - 1));
      }
      setUserVote(null);
      localStorage.removeItem(`alex_vote_${video.nb}`);
    } else {
      // Toggle/set vote
      if (userVote === 'like') {
        setLikes(prev => Math.max(0, prev - 1));
        setDislikes(prev => prev + 1);
      } else if (userVote === 'dislike') {
        setDislikes(prev => Math.max(0, prev - 1));
        setLikes(prev => prev + 1);
      } else {
        if (type === 'like') {
          setLikes(prev => prev + 1);
        } else {
          setDislikes(prev => prev + 1);
        }
      }
      setUserVote(type);
      localStorage.setItem(`alex_vote_${video.nb}`, type);
    }
  };

  // Centralized instant favorites management
  const { isFavorite: checkIsFav, toggleFavorite: toggleFav } = useFavorites();
  const mediaType = isSeries ? 'tv' : 'movie';
  const isFavorite = checkIsFav(video.nb, mediaType);

  const toggleFavorite = async () => {
    await toggleFav({
      mediaId: video.nb,
      mediaType,
      title: video.ar_title || video.en_title || 'عمل فني',
      posterPath: video.img || null,
    });
  };

  const fetchEpisodeDetails = useCallback(async (episodeId: string) => {
    episodeRequestControllerRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++episodeRequestIdRef.current;
    episodeRequestControllerRef.current = controller;
    setIsLoadingStreams(true);
    try {
      const [infoRes, streamsRes] = await Promise.all([
        fetch(`/api/proxy?endpoint=allVideoInfo/id/${encodeURIComponent(episodeId)}`, { signal: controller.signal }),
        fetch(`/api/proxy?endpoint=transcoddedFiles/id/${encodeURIComponent(episodeId)}`, { signal: controller.signal })
      ]);

      let info: Record<string, unknown> = {};
      let streams: Stream[] = [];

      if (infoRes.ok) {
        const body = await infoRes.json() as { payload?: unknown };
        if (typeof body.payload === 'string') {
          const decryptedInfo: unknown = decryptData(body.payload);
          if (decryptedInfo && typeof decryptedInfo === 'object' && !Array.isArray(decryptedInfo)) {
            info = decryptedInfo as Record<string, unknown>;
          }
        }
      }
      if (streamsRes.ok) {
        const body = await streamsRes.json() as { payload?: unknown };
        if (typeof body.payload === 'string') {
          const decryptedStreams: unknown = decryptData(body.payload);
          streams = Array.isArray(decryptedStreams) ? decryptedStreams as Stream[] : [];
        }
      }

      const combined: EpisodeDetails = {
        ...info,
        streams,
      };

      if (requestId === episodeRequestIdRef.current) {
        setActiveEpisodeDetails(combined);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      console.error("Failed to fetch episode details:", e);
      setActiveEpisodeDetails(null);
    } finally {
      if (requestId === episodeRequestIdRef.current) setIsLoadingStreams(false);
    }
  }, []);

  // Set default season and episode on load.
  useEffect(() => {
    if (!isSeries || episodes.length === 0) return;
    const firstEpisode = [...episodes].sort(compareEpisodes)[0];
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setActiveEpisode(firstEpisode);
      setCurrentSeason(firstEpisode.season || '1');
    });
    return () => { cancelled = true; };
  }, [isSeries, episodes]);

  // Fetch streams and details when active episode changes (for series).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (isSeries && activeEpisode) {
        void fetchEpisodeDetails(activeEpisode.nb);
      } else {
        setActiveEpisodeDetails(null);
      }
    });
    return () => { cancelled = true; };
  }, [activeEpisode, fetchEpisodeDetails, isSeries, video.streams]);

  useEffect(() => () => episodeRequestControllerRef.current?.abort(), []);

  // Determine if there is a next episode
  const sortedEpisodesList = [...episodes].sort(compareEpisodes);

  const activeIndex = activeEpisode
    ? sortedEpisodesList.findIndex(ep => ep.nb === activeEpisode.nb)
    : -1;

  const hasNextEpisode = isSeries && activeIndex !== -1 && activeIndex < sortedEpisodesList.length - 1;

  const playNextEpisode = () => {
    if (hasNextEpisode) {
      const nextEp = sortedEpisodesList[activeIndex + 1];
      setActiveEpisode(nextEp);
      setCurrentSeason(nextEp.season || '1');
    }
  };

  // Filter episodes for selected season
  const seasonEpisodes = episodes
    .filter(ep => ep.season === currentSeason)
    .sort((a, b) => {
      const numA = parseInt(a.episodeNummer) || 0;
      const numB = parseInt(b.episodeNummer) || 0;
      return numA - numB;
    });

  // Display details (use active episode's title/info for series)
  const displayTitle = isSeries && activeEpisode
    ? `${video.ar_title} - الحلقة ${activeEpisode.episodeNummer}`
    : video.ar_title;

  const displayEnTitle = isSeries && activeEpisode
    ? `${video.en_title || video.ar_title} - Episode ${activeEpisode.episodeNummer}`
    : (video.en_title || video.ar_title);

  const displayContent = isSeries && activeEpisode && activeEpisode.ar_content
    ? activeEpisode.ar_content
    : (video.ar_content || '');

  return (
    <WatchLayout 
      video={video}
      isSeries={isSeries}
      roomHook={roomHook}
      seasons={seasons}
      episodes={episodes}
      currentSeason={currentSeason}
      setCurrentSeason={setCurrentSeason}
      activeEpisode={activeEpisode}
      setActiveEpisode={setActiveEpisode}
      seasonEpisodes={seasonEpisodes}
      isLoadingStreams={isLoadingStreams}
      activeEpisodeDetails={activeEpisodeDetails}
      displayTitle={displayTitle}
      displayEnTitle={displayEnTitle}
      displayContent={displayContent}
      hasNextEpisode={hasNextEpisode}
      playNextEpisode={playNextEpisode}
      favoriteList={favoriteList}
      isFavorite={isFavorite}
      toggleFavorite={toggleFavorite}
      likes={likes}
      dislikes={dislikes}
      userVote={userVote}
      handleVote={handleVote}
    />
  );
}
