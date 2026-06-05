import React from 'react';
import MediaPoster from './MediaPoster';
import MediaDetails from './MediaDetails';
import ActionToolbar from './ActionToolbar';
import AdditionalInfo from './AdditionalInfo';
import PlayerSection from './PlayerSection';
import SeriesNavigator from './SeriesNavigator';

interface WatchLayoutProps {
  // Video and Series state
  video: any;
  isSeries: boolean;
  seasons: any[];
  episodes: any[];
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  activeEpisode: any;
  setActiveEpisode: (ep: any) => void;
  seasonEpisodes: any[];
  
  // Player state
  isLoadingStreams: boolean;
  activeEpisodeDetails: any;
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
}

export default function WatchLayout({
  video, isSeries, seasons, episodes, currentSeason, setCurrentSeason, activeEpisode, setActiveEpisode, seasonEpisodes,
  isLoadingStreams, activeEpisodeDetails, displayTitle, displayEnTitle, displayContent, hasNextEpisode, playNextEpisode,
  isFavorite, toggleFavorite, likes, dislikes, userVote, handleVote
}: WatchLayoutProps) {
  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto relative z-10">
      
      {/* Row 1: Player & Poster */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <div className="col-span-12 lg:col-span-9 flex flex-col justify-stretch">
          <PlayerSection 
            isLoadingStreams={isLoadingStreams}
            isSeries={isSeries}
            activeEpisodeDetails={activeEpisodeDetails}
            video={video}
            displayTitle={displayTitle}
            hasNextEpisode={hasNextEpisode}
            playNextEpisode={playNextEpisode}
          />
        </div>
        <div className="col-span-12 lg:col-span-3 flex flex-col">
          <MediaPoster img={video.img} imdbUrlRef={video.imdbUrlRef} />
        </div>
      </div>

      {/* Row 2: Details & Additional Info */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        <div className="col-span-12 lg:col-span-9 flex flex-col">
          <MediaDetails 
            title={displayTitle}
            enTitle={displayEnTitle}
            year={video.year}
            categories={video.categories}
            duration={video.duration ? parseInt(video.duration) : undefined}
            stars={video.stars}
            content={displayContent}
          >
            <ActionToolbar 
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              likes={likes}
              dislikes={dislikes}
              userVote={userVote}
              handleVote={handleVote}
            />
          </MediaDetails>
        </div>
        <div className="col-span-12 lg:col-span-3 flex flex-col">
          <AdditionalInfo 
            kind={video.kind}
            year={video.year}
            duration={video.duration ? parseInt(video.duration) : undefined}
            itemDate={video.itemDate || video.mDate}
          />
        </div>
      </div>

      {/* Row 3: Seasons & Episodes (Series Only) */}
      {isSeries && episodes.length > 0 && (
        <SeriesNavigator 
          seasons={seasons}
          episodes={episodes}
          currentSeason={currentSeason}
          setCurrentSeason={setCurrentSeason}
          activeEpisode={activeEpisode}
          setActiveEpisode={setActiveEpisode}
          seasonEpisodes={seasonEpisodes}
          videoTitle={video.ar_title}
        />
      )}
    </div>
  );
}
