import React, { useMemo } from 'react';
import PlayerWrapper from '../PlayerWrapper';
import type { WatchRoomHook } from '@/hooks/useWatchRoom';
import type {
  IntroSkipRange,
  ParentalSkippingDurations,
  ParentSkippingFlag,
} from '../playerSkipRanges';

export interface PlayerStream {
  name: string;
  resolution: string;
  container: string;
  videoUrl?: string | null;
}

export interface PlayerTranslation {
  id: number;
  name: string;
  type: string;
  extention: string;
  file: string;
}

export type IntroSkipping = IntroSkipRange;
export type SkippingDurations = ParentalSkippingDurations;

export interface RoomVideoData {
  nb?: string;
  id?: string | number;
  kind?: string;
  trailer?: string;
  stream_url?: string | null;
  img?: string;
  ar_title?: string;
  streams?: PlayerStream[];
  translations?: PlayerTranslation[];
  introSkipping?: IntroSkipping[];
  skippingDurations?: SkippingDurations | null;
  parent_skipping?: ParentSkippingFlag;
  duration?: string | number | null;
  Duration?: string | number | null;
  arTranslationFilePath?: string | null;
  enTranslationFilePath?: string | null;
}

export interface EpisodeDetails extends RoomVideoData {
  episodeNummer?: string;
}

interface PlayerSectionProps {
  isLoadingStreams: boolean;
  isSeries: boolean;
  activeEpisodeDetails: EpisodeDetails | null;
  video: RoomVideoData;
  displayTitle: string;
  hasNextEpisode: boolean;
  playNextEpisode: () => void;
  roomHook?: WatchRoomHook;
}

export const toProxyUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('/tunnel/') || trimmed.startsWith('/api/')) return trimmed;
  const match = trimmed.match(/^https?:\/\/([a-zA-Z0-9_-]+)\.shabakaty\.com\/(.*)$/i);
  if (match) {
    return `/tunnel/${match[1]}/${match[2]}`;
  }
  return trimmed;
};

export default function PlayerSection({
  isLoadingStreams,
  isSeries,
  activeEpisodeDetails,
  video,
  displayTitle,
  hasNextEpisode,
  playNextEpisode,
  roomHook
}: PlayerSectionProps) {
  const playerVideoData = useMemo(() => (
    isSeries && activeEpisodeDetails
      ? {
          nb: activeEpisodeDetails.nb || activeEpisodeDetails.id || `${video.nb || video.id}_${activeEpisodeDetails.episodeNummer}`,
          trailer: video.trailer,
          stream_url: (activeEpisodeDetails.streams?.length ?? 0) > 0
            ? toProxyUrl(activeEpisodeDetails.streams?.[0]?.videoUrl)
            : toProxyUrl(activeEpisodeDetails.stream_url),
          img: toProxyUrl(video.img),
          ar_title: displayTitle,
          streams: activeEpisodeDetails.streams?.map((stream) => ({ ...stream, videoUrl: toProxyUrl(stream.videoUrl) })) || [],
          translations: activeEpisodeDetails.translations?.map((t) => ({ ...t, file: toProxyUrl(t.file) || t.file })) || [],
          introSkipping: activeEpisodeDetails.introSkipping || [],
          skippingDurations: activeEpisodeDetails.skippingDurations || null,
          parent_skipping: activeEpisodeDetails.parent_skipping,
          duration: activeEpisodeDetails.duration || activeEpisodeDetails.Duration || null,
          arTranslationFilePath: toProxyUrl(activeEpisodeDetails.arTranslationFilePath || ''),
          enTranslationFilePath: toProxyUrl(activeEpisodeDetails.enTranslationFilePath || ''),
        }
      : {
          nb: video.nb || video.id,
          trailer: video.trailer,
          stream_url: (video.streams?.length ?? 0) > 0
            ? toProxyUrl(video.streams?.[0]?.videoUrl)
            : toProxyUrl(video.stream_url),
          img: toProxyUrl(video.img),
          ar_title: displayTitle,
          streams: video.streams?.map((stream) => ({ ...stream, videoUrl: toProxyUrl(stream.videoUrl) })) || [],
          translations: video.translations?.map((t) => ({ ...t, file: toProxyUrl(t.file) || t.file })) || [],
          introSkipping: video.introSkipping || [],
          skippingDurations: video.skippingDurations || null,
          parent_skipping: video.parent_skipping,
          duration: video.duration || video.Duration || null,
          arTranslationFilePath: toProxyUrl(video.arTranslationFilePath || ''),
          enTranslationFilePath: toProxyUrl(video.enTranslationFilePath || ''),
        }
  ), [activeEpisodeDetails, displayTitle, isSeries, video]);

  return (
    <div className="w-full relative flex flex-col justify-center">
      {isLoadingStreams ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center bg-[#0a0a0f] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="w-16 h-16 border-4 border-alex-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]"></div>
          <p className="text-gray-400 font-bold">جاري تحميل جودات البث المباشر...</p>
        </div>
      ) : (
        <PlayerWrapper 
          videoData={playerVideoData}
          onNextEpisode={hasNextEpisode ? playNextEpisode : undefined}
          roomHook={roomHook}
        />
      )}
    </div>
  );
}
