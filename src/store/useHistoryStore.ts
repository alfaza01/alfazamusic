import { create } from 'zustand';
import { Song } from '../types';

const HISTORY_KEY = 'alfaza_play_history';
const MAX_HISTORY = 50;

function loadHistory(): Song[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(songs: Song[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(songs));
  } catch {}
}

interface HistoryState {
  history: Song[];
  addToHistory: (song: Song) => void;
  removeFromHistory: (songId: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: loadHistory(),

  addToHistory: (song) => {
    const current = get().history;
    // Hapus duplikat jika lagu sudah ada, lalu tambahkan di depan
    const filtered = current.filter(s => s.id !== song.id);
    const next = [song, ...filtered].slice(0, MAX_HISTORY);
    saveHistory(next);
    set({ history: next });
  },

  removeFromHistory: (songId) => {
    const next = get().history.filter(s => s.id !== songId);
    saveHistory(next);
    set({ history: next });
  },

  clearHistory: () => {
    saveHistory([]);
    set({ history: [] });
  },
}));
