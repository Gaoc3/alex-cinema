'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { decryptData } from '@/utils/cryptoHelper';
import type { WatchRoomHook } from '@/hooks/useWatchRoom';
import PlayerSection, {
  type EpisodeDetails,
  type PlayerStream,
  type RoomVideoData,
} from './PlayerSection';
import SeriesNavigator, {
  type SeriesEpisode,
  type SeriesSeason,
} from './SeriesNavigator';

const compareEpisodes = (a: SeriesEpisode, b: SeriesEpisode) => {
  const seasonDifference = (parseInt(a.season) || 0) - (parseInt(b.season) || 0);
  if (seasonDifference !== 0) return seasonDifference;
  return (parseInt(a.episodeNummer) || 0) - (parseInt(b.episodeNummer) || 0);
};

interface RoomPlayerUIProps {
  video: RoomVideoData;
  episodes?: SeriesEpisode[];
  seasons?: SeriesSeason[];
  roomHook: WatchRoomHook;
}

interface EpisodeRequestState {
  episodeId: string;
  details: EpisodeDetails | null;
}

function getInitialEpisode(
  sortedEpisodes: SeriesEpisode[],
  remoteEpisodeId: string | null,
) {
  if (remoteEpisodeId) {
    const remoteEpisode = sortedEpisodes.find((episode) => episode.nb === remoteEpisodeId);
    if (remoteEpisode) return remoteEpisode;
  }
  return sortedEpisodes[0] ?? null;
}

function RoomPlayerContent({ video, seasons = [], episodes = [], roomHook }: RoomPlayerUIProps) {
  const safeEpisodes = Array.isArray(episodes) ? episodes : [];
  const safeSeasons = Array.isArray(seasons) ? seasons : [];
  const safeVideo = video || {} as RoomVideoData;

  const isSeries = safeVideo.kind === '2';
  const canChangeEpisode = Boolean(roomHook?.isHost || roomHook?.userPermissions?.canChangeMedia);
  const sortedEpisodesList = useMemo(
    () => [...safeEpisodes].sort(compareEpisodes),
    [safeEpisodes],
  );
  const initialEpisode = getInitialEpisode(sortedEpisodesList, roomHook?.remoteEpisodeId ?? null);
  const [activeEpisode, setActiveEpisode] = useState<SeriesEpisode | null>(initialEpisode);
  const [currentSeason, setCurrentSeason] = useState(initialEpisode?.season || '');
  const activeEpisodeId = activeEpisode?.nb ?? null;

  // Gracefully sync episode when host or room changes remoteEpisodeId without destroying player instance
  useEffect(() => {
    if (!isSeries || !roomHook?.remoteEpisodeId) return;
    const target = sortedEpisodesList.find((ep) => ep.nb === roomHook.remoteEpisodeId);
    if (target && target.nb !== activeEpisode?.nb) {
      setActiveEpisode(target);
      if (target.season) setCurrentSeason(target.season);
    }
  }, [isSeries, roomHook?.remoteEpisodeId, sortedEpisodesList, activeEpisode?.nb]);

  useEffect(() => {
    if (!isSeries || !activeEpisodeId) return;

    const controller = new AbortController();
    const episodeId = activeEpisodeId;

    const loadEpisodeDetails = async () => {
      try {
        const [infoRes, streamsRes] = await Promise.all([
          fetch(`/api/proxy?endpoint=allVideoInfo/id/${encodeURIComponent(episodeId)}`, {
            signal: controller.signal,
          }),
          fetch(`/api/proxy?endpoint=transcoddedFiles/id/${encodeURIComponent(episodeId)}`, {
            signal: controller.signal,
          }),
        ]);

        let info: Record<string, unknown> = {};
        let streams: PlayerStream[] = [];

        if (infoRes.ok) {
          const response = (await infoRes.json()) as { payload: string };
          const decrypted: unknown = decryptData(response.payload);
          if (decrypted && typeof decrypted === 'object' && !Array.isArray(decrypted)) {
            info = decrypted as Record<string, unknown>;
          }
        }

        if (streamsRes.ok) {
          const response = (await streamsRes.json()) as { payload: string };
          const decrypted: unknown = decryptData(response.payload);
          if (Array.isArray(decrypted)) streams = decrypted as PlayerStream[];
        }

        const details = { ...info, streams } as EpisodeDetails;
        if (!controller.signal.aborted) {
          setEpisodeRequest({ episodeId, details });
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch episode details:', error);
        setEpisodeRequest({ episodeId, details: null });
      }
    };

    void loadEpisodeDetails();
    return () => controller.abort();
  }, [activeEpisodeId, isSeries]);

  const activeEpisodeDetails = activeEpisodeId && episodeRequest?.episodeId === activeEpisodeId
    ? episodeRequest.details
    : null;
  const isLoadingStreams = Boolean(
    isSeries && activeEpisodeId && episodeRequest?.episodeId !== activeEpisodeId,
  );

  const activeIndex = activeEpisode
    ? sortedEpisodesList.findIndex((episode) => episode.nb === activeEpisode.nb)
    : -1;
  const hasNextEpisode = isSeries
    && activeIndex !== -1
    && activeIndex < sortedEpisodesList.length - 1;

  const selectEpisode = async (episode: SeriesEpisode) => {
    if (!canChangeEpisode || !roomHook) return;

    const result = await roomHook.changeEpisode(
      episode.nb,
      episode.season || '',
      episode.episodeNummer || '',
    );
    if (!result.ok) {
      toast.error(result.error || 'تعذر مزامنة الحلقة مع الغرفة');
      return;
    }

    setActiveEpisode(episode);
    setCurrentSeason(episode.season || '1');
  };

  const playNextEpisode = () => {
    if (hasNextEpisode && canChangeEpisode) {
      void selectEpisode(sortedEpisodesList[activeIndex + 1]);
    }
  };

  const seasonEpisodes = useMemo(
    () => safeEpisodes
      .filter((episode) => episode.season === currentSeason)
      .sort((a, b) => {
        const numA = parseInt(a.episodeNummer) || 0;
        const numB = parseInt(b.episodeNummer) || 0;
        return numA - numB;
      }),
    [currentSeason, safeEpisodes],
  );

  const displayTitle = isSeries && activeEpisode
    ? `${safeVideo.ar_title || ''} - الحلقة ${activeEpisode.episodeNummer}`
    : safeVideo.ar_title || '';

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-4 sm:gap-5">
      {/* 1. Dedicated Player Stage Card */}
      <div className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-white/12 bg-[#090e1d]/90 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <PlayerSection
          isLoadingStreams={isLoadingStreams}
          isSeries={isSeries}
          activeEpisodeDetails={activeEpisodeDetails}
          video={safeVideo}
          displayTitle={displayTitle}
          hasNextEpisode={hasNextEpisode && canChangeEpisode}
          playNextEpisode={playNextEpisode}
          roomHook={roomHook}
        />
      </div>

      {/* 2. Completely Separated Luxury Series Episodes Card */}
      {isSeries && safeEpisodes.length > 0 && (
        <div className="relative w-full min-w-0">
          <SeriesNavigator
            seasons={safeSeasons}
            episodes={safeEpisodes}
            currentSeason={currentSeason}
            setCurrentSeason={setCurrentSeason}
            activeEpisode={activeEpisode}
            setActiveEpisode={selectEpisode}
            seasonEpisodes={seasonEpisodes}
            videoTitle={safeVideo.ar_title || ''}
            videoImg={safeVideo.img || ''}
            canSelectEpisodes={canChangeEpisode}
          />
        </div>
      )}
    </div>
  );
}

export default function RoomPlayerUI(props: RoomPlayerUIProps) {
  const safeVideo = props.video || {} as RoomVideoData;
  const safeEpisodes = Array.isArray(props.episodes) ? props.episodes : [];
  const safeSeasons = Array.isArray(props.seasons) ? props.seasons : [];

  return <RoomPlayerContent {...props} video={safeVideo} episodes={safeEpisodes} seasons={safeSeasons} />;
}
