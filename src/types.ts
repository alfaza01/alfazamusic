export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: string;
  durationSec?: number;
  url?: string;
  badge?: 'Trending' | 'New' | 'Popular' | 'Official' | 'Premium' | string;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  title: string;
  creator: string;
  cover: string;
  songCount: number;
}
