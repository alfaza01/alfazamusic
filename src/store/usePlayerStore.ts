import { create } from 'zustand';
import { Song, Playlist } from '../types';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isPlayerOpen: boolean;
  queue: Song[];
  
  // Custom Play Modes
  playMode: 'full' | 'preview'; // full is client-side YouTube, preview is 30s iTunes
  isLoadingAudio: boolean;
  audioError: string | null;

  // Progress tracking
  progressPercent: number;
  currentTimeSec: number;
  totalDurationSec: number;

  // React Player control from UI
  seekRequest: number | null; // Value 0-1 indicating percentage to seek to
  
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  setPlayerOpen: (isOpen: boolean) => void;
  nextSong: () => void;
  prevSong: () => void;
  setPlayMode: (mode: 'full' | 'preview') => void;
  setLoadingAudio: (isLoading: boolean) => void;
  setAudioError: (error: string | null) => void;
  
  // Audio state actions
  setProgress: (playedPercent: number, playedSec: number, totalDurationSec: number) => void;
  requestSeek: (percent: number) => void;
  clearSeekRequest: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  isPlayerOpen: false,
  queue: [],
  
  playMode: 'full',
  isLoadingAudio: false,
  audioError: null,

  progressPercent: 0,
  currentTimeSec: 0,
  totalDurationSec: 0,
  seekRequest: null,
  
  playSong: (song, newQueue) => set((state) => ({
    currentSong: song,
    isPlaying: true,
    isPlayerOpen: false,
    queue: newQueue || state.queue,
    progressPercent: 0,
    currentTimeSec: 0,
    audioError: null
  })),

  togglePlay: () => set((state) => ({ 
    isPlaying: !state.isPlaying 
  })),

  setPlayerOpen: (isOpen) => set({ isPlayerOpen: isOpen }),

  nextSong: () => set((state) => {
    if (state.queue.length === 0 || !state.currentSong) return state;
    const currentIndex = state.queue.findIndex(s => s.id === state.currentSong?.id);
    if (currentIndex >= 0 && currentIndex < state.queue.length - 1) {
      return { 
        currentSong: state.queue[currentIndex + 1], 
        isPlaying: true,
        progressPercent: 0,
        currentTimeSec: 0,
        audioError: null
      };
    }
    return state;
  }),

  prevSong: () => set((state) => {
    if (state.queue.length === 0 || !state.currentSong) return state;
    const currentIndex = state.queue.findIndex(s => s.id === state.currentSong?.id);
    if (currentIndex > 0) {
      return { 
        currentSong: state.queue[currentIndex - 1], 
        isPlaying: true,
        progressPercent: 0,
        currentTimeSec: 0,
        audioError: null
      };
    }
    return state;
  }),

  setPlayMode: (mode) => set({ playMode: mode }),
  setLoadingAudio: (isLoading) => set({ isLoadingAudio: isLoading }),
  setAudioError: (error) => set({ audioError: error, isLoadingAudio: false }),
  
  setProgress: (playedPercent, playedSec, totalSec) => set({
    progressPercent: playedPercent * 100,
    currentTimeSec: playedSec,
    totalDurationSec: totalSec
  }),
  
  requestSeek: (percent: number) => set({ seekRequest: Math.max(0, Math.min(percent, 1)) }),
  clearSeekRequest: () => set({ seekRequest: null })
}));
