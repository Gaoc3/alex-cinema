import React from 'react';
import MediaPoster from './MediaPoster';
import MediaDetails from './MediaDetails';
import ActionToolbar from './ActionToolbar';
import PlayerSection, { type EpisodeDetails, type RoomVideoData } from './PlayerSection';
import SeriesNavigator, { type SeriesEpisode, type SeriesSeason } from './SeriesNavigator';
import type { WatchRoomHook } from '@/hooks/useWatchRoom';
import type { MediaCategory, MediaPerson } from './MediaDetails';

type WatchVideoData = Omit<RoomVideoData, 'nb' | 'img'> & {
  nb: string | number;
  ar_title: string;
  img?: string | null;
  en_title?: string;
  imdbUrlRef?: string;
  year?: string;
  categories?: MediaCategory[];
  stars?: string;
  ar_content?: string;
  actorsInfo?: MediaPerson[];
  directorsInfo?: MediaPerson[];
  writersInfo?: MediaPerson[];
  itemDate?: string;
  mDate?: string;
};

interface WatchEpisode extends SeriesEpisode {
  ar_title: string;
  en_title: string;
}

interface WatchLayoutProps {
  // Video and Series state
  video: WatchVideoData;
  isSeries: boolean;
  seasons: SeriesSeason[];
  episodes: WatchEpisode[];
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  activeEpisode: WatchEpisode | null;
  setActiveEpisode: (episode: WatchEpisode) => void;
  seasonEpisodes: WatchEpisode[];
  
  // Player state
  isLoadingStreams: boolean;
  activeEpisodeDetails: EpisodeDetails | null;
  displayTitle: string;
  displayEnTitle: string;
  displayContent: string;
  hasNextEpisode: boolean;
  playNextEpisode: () => void;
  
  // User Actions state
  favoriteList: string[];
  isFavorite: boolean;
  toggleFavorite: () => void;
  likes: number;
  dislikes: number;
  userVote: 'like' | 'dislike' | null;
  handleVote: (type: 'like' | 'dislike') => void;
  roomHook?: WatchRoomHook;
}

export default function WatchLayout({
  video, isSeries, seasons, episodes, currentSeason, setCurrentSeason, activeEpisode, setActiveEpisode, seasonEpisodes,
  isLoadingStreams, activeEpisodeDetails, displayTitle, displayContent, hasNextEpisode, playNextEpisode,
  isFavorite, toggleFavorite, likes, dislikes, userVote, handleVote, roomHook
}: WatchLayoutProps) {
  const playerVideo: RoomVideoData = {
    ...video,
    nb: String(video.nb),
    img: video.img || undefined,
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto relative z-10">
      
      {/* Row 1: Player & Poster */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <div className={`col-span-12 ${roomHook ? '' : 'lg:col-span-9'} flex flex-col justify-stretch`}>
          <PlayerSection 
            isLoadingStreams={isLoadingStreams}
            isSeries={isSeries}
            activeEpisodeDetails={activeEpisodeDetails}
            video={playerVideo}
            displayTitle={displayTitle}
            hasNextEpisode={hasNextEpisode}
            playNextEpisode={playNextEpisode}
            roomHook={roomHook}
          />
        </div>
        {!roomHook && (
          <div className="col-span-12 lg:col-span-3 flex flex-col px-4 sm:px-0 mt-4 sm:mt-0">
            <MediaPoster img={video.img || ''} imdbUrlRef={video.imdbUrlRef} />
          </div>
        )}
      </div>

      {/* Row 2: Dynamic Full Width Details Panel */}
      {!roomHook && (
        <div className="px-4 sm:px-0">
          <MediaDetails 
            title={video.ar_title}
            enTitle={video.en_title || video.ar_title}
            episodeNum={isSeries && activeEpisode ? activeEpisode.episodeNummer : undefined}
            seasonNum={isSeries ? currentSeason : undefined}
            year={video.year}
            categories={video.categories}
            duration={video.duration ? parseInt(String(video.duration)) : undefined}
            stars={video.stars}
            content={displayContent}
            actorsInfo={video.actorsInfo}
            directorsInfo={video.directorsInfo}
            writersInfo={video.writersInfo}
            kind={video.kind}
            itemDate={video.itemDate || video.mDate}
          >
            <ActionToolbar 
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              likes={likes}
              dislikes={dislikes}
              userVote={userVote}
              handleVote={handleVote}
              videoId={String(video.nb)}
            />
          </MediaDetails>
        </div>
      )}

      {/* Row 3: Seasons & Episodes (Series Only) */}
      {isSeries && episodes.length > 0 && (
        <div className="px-4 sm:px-0 pb-10 sm:pb-0">
          <SeriesNavigator 
            seasons={seasons}
            episodes={episodes}
            currentSeason={currentSeason}
            setCurrentSeason={setCurrentSeason}
            activeEpisode={activeEpisode}
            setActiveEpisode={(episode) => setActiveEpisode(episode as WatchEpisode)}
            seasonEpisodes={seasonEpisodes}
            videoTitle={video.ar_title}
            videoImg={video.img || ''}
          />
        </div>
      )}
    </div>
  );
}
