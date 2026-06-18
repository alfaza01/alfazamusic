// IndexedDB Database management for Offline/Local Audio files and Downloads
import { Song } from '../types';

const DB_NAME = 'HarmoniLocalMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

export interface LocalSongRecord {
  id: string; // unique ID
  title: string;
  artist: string;
  cover: string;
  duration: string;
  durationSec: number;
  url?: string; // object URL generated at runtime
  blob: Blob; // the actual MP3/media binary
  isLocalImport: boolean; // whether imported via local file picker or downloaded
  addedAt: number;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Failed to open IndexedDB');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Save/update song record
export async function saveSong(song: Song, audioBlob: Blob, isLocalImport: boolean = false): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Clean up suffix from categories on ID if any
    const baseId = song.id.split('_')[0];
    const finalId = isLocalImport ? `local_${Date.now()}_${Math.floor(Math.random() * 1000)}` : baseId;

    const record: LocalSongRecord = {
      id: finalId,
      title: song.title,
      artist: song.artist,
      cover: song.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
      duration: song.duration || '0:30',
      durationSec: song.durationSec || 30,
      blob: audioBlob,
      isLocalImport,
      addedAt: Date.now()
    };

    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to save song to IndexedDB');
  });
}

// Get all songs currently saved
export async function getSavedSongs(): Promise<LocalSongRecord[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const records = request.result as LocalSongRecord[];
      // Sort newest first
      records.sort((a, b) => b.addedAt - a.addedAt);
      resolve(records);
    };
    request.onerror = () => reject('Failed to fetch songs from IndexedDB');
  });
}

// Delete a saved song
export async function deleteSavedSong(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to delete song from IndexedDB');
  });
}

// Check if a song ID is already downloaded
export async function isSongDownloaded(baseId: string): Promise<boolean> {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(baseId.split('_')[0]);

    request.onsuccess = () => {
      resolve(!!request.result);
    };
    request.onerror = () => {
      resolve(false);
    };
  });
}
