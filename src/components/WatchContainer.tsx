'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { decryptData } from '@/utils/cryptoHelper';
import WatchLayout from './watch/WatchLayout';
import { useUnifiedAuth } from './auth/UnifiedAuthProvider';
import { useAuth } from '@clerk/nextjs';
import toast from 'react-hot-toast';

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

interface WatchContainerProps {
  video: any;
  episodes: Episode[];
  seasons: Season[];
  roomHook?: any;
}

export default function WatchContainer({ video, seasons, episodes, roomHook }: WatchContainerProps) {
  const isSeries = video.kind === '2';
  
  // For series, active episode state. Default to first episode of first season.
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [episodeStreams, setEpisodeStreams] = useState<Stream[]>([]);
  const [activeEpisodeDetails, setActiveEpisodeDetails] = useState<any>(null);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [favoriteList, setFavoriteList] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Likes and Dislikes States
  const [likes, setLikes] = useState<number>(0);
  const [dislikes, setDislikes] = useState<number>(0);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);

  // Initialize Likes/Dislikes and User Vote from localStorage
  useEffect(() => {
    setLikes(parseInt(video.Likes || '0'));
    setDislikes(parseInt(video.DisLikes || '0'));
    
    if (typeof window !== 'undefined') {
      const savedVote = localStorage.getItem(`alex_vote_${video.nb}`);
      if (savedVote === 'like' || savedVote === 'dislike') {
        setUserVote(savedVote);
      }
    }
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

  // Initialize favorite status using unified auth
  const { isSignedIn, isLoaded, user } = useUnifiedAuth();
  const { getToken } = useAuth();
  const [isPendingFav, startTransitionFav] = useTransition();

  // Fetch initial favorite status
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!isLoaded || (!isSignedIn && !user)) return;
      try {
        const token = await getToken().catch(() => null);
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/favorites', { headers });
        const data = await res.json();
        if (data.success && data.favorites) {
          const isFav = data.favorites.some((f: any) => f.mediaId === video.nb);
          setIsFavorite(isFav);
        }
      } catch (err) {
        console.error("Failed to fetch favorites status", err);
      }
    };
    checkFavoriteStatus();
  }, [video.nb, isLoaded, isSignedIn, user, getToken]);

import toast from 'react-hot-toast';

  const toggleFavorite = async () => {
    if (!isLoaded || (!isSignedIn && !user)) {
      toast.error("يجب تسجيل الدخول لإضافة المفضلات ⚠️");
      return;
    }

    startTransitionFav(() => {
      setIsFavorite(!isFavorite);
    });

    try {
      const token = await getToken().catch(() => null);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          mediaId: video.nb, 
          mediaType: isSeries ? 'tv' : 'movie',
          title: video.ar_title || video.en_title,
          posterPath: video.img
        })
      });

      const data = await res.json();
      if (!data.success) {
        setIsFavorite(isFavorite);
        toast.error(data.error || 'حدث خطأ أثناء تعديل المفضلات');
      } else {
        const added = data.action === 'added';
        setIsFavorite(added);
        if (added) {
          toast.success('تمت الإضافة للمفضلة بنجاح! ❤️');
        } else {
          toast('تمت الإزالة من المفضلة', { icon: '🗑️' });
        }
      }
    } catch (err) {
      console.error(err);
      setIsFavorite(isFavorite);
      toast.error('حدث خطأ أثناء الاتصال بالخادم');
    }
  };

  // Set default season and episode on load
  useEffect(() => {
    if (isSeries && episodes.length > 0) {
      const sortedEpisodes = [...episodes].sort((a, b) => {
        const numA = parseInt(a.episodeNummer) || 0;
        const numB = parseInt(b.episodeNummer) || 0;
        return numA - numB;
      });
      
      const firstEp = sortedEpisodes[0];
      setActiveEpisode(firstEp);
      setCurrentSeason(firstEp.season || '1');
    }
  }, [isSeries, episodes]);

  // Fetch streams and details when active episode changes (for series)
  useEffect(() => {
    if (isSeries && activeEpisode) {
      fetchEpisodeDetails(activeEpisode.nb);
    } else {
      // For movie, use initial streams and details passed in video
      setEpisodeStreams(video.streams || []);
      setActiveEpisodeDetails(null);
    }
  }, [activeEpisode, isSeries, video]);

  const fetchEpisodeDetails = async (episodeId: string) => {
    setIsLoadingStreams(true);
    try {
      const [infoRes, streamsRes] = await Promise.all([
        fetch(`/api/proxy?endpoint=allVideoInfo/id/${episodeId}`),
        fetch(`/api/proxy?endpoint=transcoddedFiles/id/${episodeId}`)
      ]);

      let info: any = {};
      let streams: any[] = [];

      if (infoRes.ok) {
        info = decryptData((await infoRes.json()).payload);
      }
      if (streamsRes.ok) {
        streams = decryptData((await streamsRes.json()).payload);
      }

      const combined = {
        ...info,
        streams: Array.isArray(streams) ? streams : []
      };

      setActiveEpisodeDetails(combined);
      setEpisodeStreams(combined.streams);
    } catch (e) {
      console.error("Failed to fetch episode details:", e);
      setActiveEpisodeDetails(null);
      setEpisodeStreams([]);
    } finally {
      setIsLoadingStreams(false);
    }
  };

  // Determine if there is a next episode
  const sortedEpisodesList = [...episodes].sort((a, b) => {
    const numA = parseInt(a.episodeNummer) || 0;
    const numB = parseInt(b.episodeNummer) || 0;
    return numA - numB;
  });

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
    : video.en_title;

  const displayContent = isSeries && activeEpisode && activeEpisode.ar_content
    ? activeEpisode.ar_content
    : video.ar_content;

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
