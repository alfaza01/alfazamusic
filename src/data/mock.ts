import { Song, Playlist } from "../types";

export const trendingSongs: Song[] = [
  {
    id: "1",
    title: "Midnight City",
    artist: "M83",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop",
    duration: "4:00",
    badge: "Trending",
    isFavorite: true,
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 240
  },
  {
    id: "2",
    title: "Blinding Lights",
    artist: "The Weeknd",
    cover: "https://images.unsplash.com/photo-1493225457124-a1a2a4faea3f?q=80&w=300&auto=format&fit=crop",
    duration: "3:22",
    badge: "Top 1",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 202
  },
  {
    id: "3",
    title: "Starboy",
    artist: "The Weeknd",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
    duration: "3:50",
    badge: "Popular",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 230
  },
];

export const recentSongs: Song[] = [
  {
    id: "4",
    title: "Lost in the Fire",
    artist: "Gesaffelstein",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop",
    duration: "3:22",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 202
  },
  {
    id: "5",
    title: "Instant Crush",
    artist: "Daft Punk",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    duration: "5:38",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 338
  },
];

export const newReleases: Song[] = [
  {
    id: "6",
    title: "Levitating",
    artist: "Dua Lipa",
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300&auto=format&fit=crop",
    duration: "3:23",
    badge: "New",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 203
  },
  {
    id: "7",
    title: "As It Was",
    artist: "Harry Styles",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=300&auto=format&fit=crop",
    duration: "2:47",
    badge: "New",
    url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/2b/d8/ae/2bd8ae14-f573-9cf6-6174-a97635ae4087/mzaf_760508910811340009.plus.aac.p.m4a",
    durationSec: 167
  },
];

export const curatedPlaylists: Playlist[] = [
  {
    id: "p1",
    title: "Morning Chill",
    creator: "Alfaza Music",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
    songCount: 45,
  },
  {
    id: "p2",
    title: "Workout Boost",
    creator: "Alfaza Music",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    songCount: 30,
  },
  {
    id: "p3",
    title: "Deep Focus",
    creator: "Alfaza Music",
    cover: "https://images.unsplash.com/photo-1493225457124-a1a2a4faea3f?q=80&w=300&auto=format&fit=crop",
    songCount: 120,
  },
];
