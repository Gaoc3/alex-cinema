import { encodeProxyUrl } from '@/utils/proxyHelper';
import React from 'react';
import AlexPlayer from '../AlexPlayer';

interface PlayerSectionProps {
  isLoadingStreams: boolean;
  isSeries: boolean;
  activeEpisodeDetails: any;
  video: any;
  displayTitle: string;
  hasNextEpisode: boolean;
  playNextEpisode: () => void;
}

const toProxyUrl = (url: string | undefined | null) => {
  if (!url) return undefined;
  let clean = url;
  
  // Use stream API for videos to support seeking and range requests
  if (clean.includes('.mp4') || clean.includes('video')) {
    return `/api/stream?url=${encodeProxyUrl(clean)}`;
  }
  
  return `/api/proxy?endpoint=${encodeProxyUrl(clean)}`;
};

export default function PlayerSection({
  isLoadingStreams,
  isSeries,
  activeEpisodeDetails,
  video,
  displayTitle,
  hasNextEpisode,
  playNextEpisode
}: PlayerSectionProps) {
  return (
    <div className="bg-black rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 relative group transition-all duration-300 hover:border-alex-primary/30 h-full flex flex-col justify-center min-h-[220px] sm:min-h-[300px] lg:min-h-[350px]">
      {isLoadingStreams ? (
        <div className="aspect-video w-full flex flex-col items-center justify-center bg-alex-card">
          <div className="w-16 h-16 border-4 border-alex-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(229,9,20,0.3)]"></div>
          <p className="text-gray-400 font-bold">جاري تحميل جودات البث المباشر...</p>
        </div>
      ) : (
        <AlexPlayer 
          videoData={
            isSeries && activeEpisodeDetails
              ? {
                  trailer: video.trailer,
                  stream_url: activeEpisodeDetails.streams?.length > 0 
                    ? toProxyUrl(activeEpisodeDetails.streams[0].videoUrl)
                    : (activeEpisodeDetails.fileFile 
                        ? toProxyUrl(`https://cndw2.shabakaty.com/m240/${activeEpisodeDetails.fileFile}`)
                        : null),
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
        />
      )}
    </div>
  );
}