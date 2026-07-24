import React from 'react';
import PlayerWrapper from '../PlayerWrapper';

interface PlayerSectionProps {
  isLoadingStreams: boolean;
  isSeries: boolean;
  activeEpisodeDetails: any;
  video: any;
  displayTitle: string;
  hasNextEpisode: boolean;
  playNextEpisode: () => void;
  roomHook?: any;
}

const toProxyUrl = (url: string | undefined | null) => {
  if (!url) return undefined;
  return url;
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
  return (
    <div className="w-full relative flex flex-col justify-center">
      {isLoadingStreams ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center bg-[#0a0a0f] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="w-16 h-16 border-4 border-alex-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]"></div>
          <p className="text-gray-400 font-bold">جاري تحميل جودات البث المباشر...</p>
        </div>
      ) : (
        <PlayerWrapper 
          videoData={
            isSeries && activeEpisodeDetails
              ? {
                  nb: activeEpisodeDetails.nb || activeEpisodeDetails.id || `${video.nb || video.id}_${activeEpisodeDetails.episodeNummer}`,
                  trailer: video.trailer,
                  stream_url: activeEpisodeDetails.streams?.length > 0 
                    ? toProxyUrl(activeEpisodeDetails.streams[0].videoUrl)
                    : toProxyUrl(activeEpisodeDetails.stream_url),
                  img: toProxyUrl(video.img),
                  ar_title: displayTitle,
                  streams: activeEpisodeDetails.streams?.map((s: any) => ({...s, videoUrl: toProxyUrl(s.videoUrl)})) || [],
                  translations: activeEpisodeDetails.translations || [],
                  introSkipping: activeEpisodeDetails.introSkipping || [],
                  skippingDurations: activeEpisodeDetails.skippingDurations || null,
                  duration: activeEpisodeDetails.duration || activeEpisodeDetails.Duration || null,
                  arTranslationFilePath: toProxyUrl(activeEpisodeDetails.arTranslationFilePath || ''),
                  enTranslationFilePath: toProxyUrl(activeEpisodeDetails.enTranslationFilePath || '')
                }
                : {
                  nb: video.nb || video.id,
                  trailer: video.trailer,
                  stream_url: video.streams?.length > 0 
                    ? toProxyUrl(video.streams[0].videoUrl) 
                    : toProxyUrl(video.stream_url),
                  img: toProxyUrl(video.img),
                  ar_title: displayTitle,
                  streams: video.streams?.map((s: any) => ({...s, videoUrl: toProxyUrl(s.videoUrl)})) || [],
                  translations: video.translations || [],
                  introSkipping: video.introSkipping || [],
                  skippingDurations: video.skippingDurations || null,
                  duration: video.duration || video.Duration || null,
                  arTranslationFilePath: toProxyUrl(video.arTranslationFilePath || ''),
                  enTranslationFilePath: toProxyUrl(video.enTranslationFilePath || '')
                }
          }
          onNextEpisode={hasNextEpisode ? playNextEpisode : undefined}
          roomHook={roomHook}
        />
      )}
    </div>
  );
}