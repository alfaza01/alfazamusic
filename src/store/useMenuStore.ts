import { create } from 'zustand';
import { Song } from '../types';

interface MenuState {
  activeSongMenu: Song | null;
  detailModalSong: Song | null;
  converterModalSong: Song | null;
  isConverterMinimized: boolean;
  openMenu: (song: Song) => void;
  closeMenu: () => void;
  openDetail: (song: Song) => void;
  closeDetail: () => void;
  openConverter: (song: Song) => void;
  closeConverter: () => void;
  minimizeConverter: () => void;
  restoreConverter: () => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  activeSongMenu: null,
  detailModalSong: null,
  converterModalSong: null,
  isConverterMinimized: false,
  
  openMenu: (song) => set({ activeSongMenu: song }),
  closeMenu: () => set({ activeSongMenu: null }),
  
  openDetail: (song) => set({ detailModalSong: song, activeSongMenu: null }),
  closeDetail: () => set({ detailModalSong: null }),

  openConverter: (song) => set({ converterModalSong: song, isConverterMinimized: false, activeSongMenu: null }),
  closeConverter: () => set({ converterModalSong: null, isConverterMinimized: false }),
  minimizeConverter: () => set({ isConverterMinimized: true }),
  restoreConverter: () => set({ isConverterMinimized: false }),
}));
