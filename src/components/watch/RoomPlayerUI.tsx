'use client';

import React, { useState, useEffect } from 'react';
import { decryptData } from '@/utils/cryptoHelper';
import PlayerSection from './PlayerSection';
import SeriesNavigator from './SeriesNavigator';

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

interface RoomPlayerUIProps {
  video: any;
  episodes: Episode[];
  seasons: Season[];
  roomHook: any;
}

export default function RoomPlayerUI({ video, seasons, episodes, roomHook }: RoomPlayerUIProps) {
  const isSeries = video.kind === '2';
  
  // For series, active episode state. Default to first episode of first season.
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const [episodeStreams, setEpisodeStreams] = useState<Stream[]>([]);
  const [activeEpisodeDetails, setActiveEpisodeDetails] = useState<any>(null);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);

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

  return (
    <div className="flex flex-col w-full bg-black/40 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative">
      {/* Absolute dedicated player section */}
      <div className="w-full relative">
        <PlayerSection 
          isLoadingStreams={isLoadingStreams}
          isSeries={isSeries}
          activeEpisodeDetails={activeEpisodeDetails}
          video={video}
          displayTitle={displayTitle}
          hasNextEpisode={hasNextEpisode}
          playNextEpisode={playNextEpisode}
          roomHook={roomHook}
        />
      </div>

      {/* Series episodes navigator directly attached below the video player in the same container */}
      {isSeries && episodes.length > 0 && (
        <div className="bg-white/5 border-t border-white/10 pt-6 pb-4">
          <div className="px-4 md:px-8">
            <SeriesNavigator 
              seasons={seasons}
              episodes={episodes}
              currentSeason={currentSeason}
              setCurrentSeason={setCurrentSeason}
              activeEpisode={activeEpisode}
              setActiveEpisode={setActiveEpisode}
              seasonEpisodes={seasonEpisodes}
              videoTitle={video.ar_title}
              videoImg={video.img}
            />
          </div>
        </div>
      )}
    </div>
  );
}
